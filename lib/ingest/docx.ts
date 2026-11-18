import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';
import * as mammoth from 'mammoth';

function decodeText(html: string): string {
  return html.replace(/<[^>]*>/g, '')
    .replace(/&(?:#(\d+)|#x([\da-f]+)|amp|lt|gt|quot|apos|nbsp);/gi, (entity, decimal: string, hex: string) => {
      if (decimal || hex) {
        const code = parseInt(decimal || hex, decimal ? 10 : 16);
        return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
      }
      return ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' } as Record<string, string>)[entity.toLowerCase()] || entity;
    });
}

/** Convert Mammoth's generated HTML into source text with headings and simple tables intact. */
export function docxHtmlToText(html: string): string {
  return decodeText(html
    .replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, table => {
      const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(([, row]) =>
        [...row.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(([, cell]) =>
          cell.replace(/<\/(?:p|li)>|<br\s*\/?\s*>/gi, ' ').replace(/\|/g, '\\|').trim(),
        ),
      ).filter(row => row.length);
      const columns = rows.reduce((max, row) => Math.max(max, row.length), 0);
      if (!columns) return '';
      const line = (cells: string[]) => `| ${Array.from({ length: columns }, (_, i) => cells[i] || '').join(' | ')} |`;
      const header = /^<tr\b[^>]*>\s*<th\b/i.test(table.match(/<tr\b[\s\S]*?<\/tr>/i)?.[0] || '');
      const body = header ? rows.slice(1) : rows;
      return `\n\n${[line(header ? rows[0] : []), line(Array(columns).fill('---')), ...body.map(line)].join('\n')}\n\n`;
    })
    .replace(/<h([1-6])\b[^>]*>/gi, (_, level: string) => `\n\n${'#'.repeat(Number(level))} `)
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|table|ul|ol|li)>/gi, '\n\n'))
    .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n')
    .trim();
}

const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const BREAK_CLASS = 'docsetu-page-break';
type EmbeddedImage = { base64: string; mimeType: string };

async function prepareWordBreaks(buffer: Buffer) {
  const archive = await JSZip.loadAsync(buffer);
  const propertiesXml = await archive.file('docProps/app.xml')?.async('string');
  const storedPages = Number(propertiesXml?.match(/<(?:[\w-]+:)?Pages>\s*(\d+)\s*<\//)?.[1]);
  const original = { buffer, storedPages };
  const part = archive.file('word/document.xml');
  if (!part) return original;
  const xml = await part.async('string');
  if (!/lastRenderedPageBreak|pageBreakBefore/.test(xml)) return original;

  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const paragraphs = Array.from(document.getElementsByTagNameNS(WORD_NS, 'p'));
  for (const paragraph of paragraphs) {
    const properties = Array.from(paragraph.childNodes).find(node => node.nodeType === 1 && (node as Element).localName === 'pPr');
    if (!properties) continue;
    const breakBefore = Array.from(properties.childNodes).find(node => node.nodeType === 1 && (node as Element).localName === 'pageBreakBefore') as Element | undefined;
    if (!breakBefore || ['0', 'false', 'off'].includes(breakBefore.getAttributeNS(WORD_NS, 'val') || '')) continue;
    const run = document.createElementNS(WORD_NS, 'w:r');
    run.appendChild(document.createElementNS(WORD_NS, 'w:lastRenderedPageBreak'));
    paragraph.insertBefore(run, properties.nextSibling);
  }

  let previousBreak: 'manual' | 'saved' | undefined;
  for (const element of Array.from(document.getElementsByTagNameNS(WORD_NS, '*'))) {
    const saved = element.localName === 'lastRenderedPageBreak';
    const manual = element.localName === 'br' && element.getAttributeNS(WORD_NS, 'type') === 'page';
    if (!saved && !manual) {
      if ((element.localName === 't' && element.textContent?.trim()) || element.localName === 'drawing') previousBreak = undefined;
      continue;
    }
    const kind = saved ? 'saved' : 'manual';
    if (previousBreak && previousBreak !== kind) {
      element.parentNode?.removeChild(element);
      continue;
    }
    previousBreak = kind;
    if (saved) {
      const replacement = document.createElementNS(WORD_NS, 'w:br');
      replacement.setAttributeNS(WORD_NS, 'w:type', 'page');
      element.parentNode?.replaceChild(replacement, element);
    }
  }

  archive.file('word/document.xml', new XMLSerializer().serializeToString(document));
  return { buffer: await archive.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }), storedPages };
}

/** Breaks Mammoth HTML at page markers while keeping surrounding paragraphs and tables balanced. */
function splitWordPages(html: string): string[] {
  if (!html.includes(BREAK_CLASS)) return [html];
  const root = new DOMParser().parseFromString(`<body>${html}</body>`, 'application/xml').documentElement;
  const serializer = new XMLSerializer();
  const pages: string[] = [];
  const parents: Array<{ open: string; close: string }> = [];
  let current = '';
  function visit(node: Node) {
    const element = node.nodeType === 1 ? node as Element : null;
    if (element?.tagName === 'hr' && element.getAttribute('class') === BREAK_CLASS) {
      pages.push(current + parents.slice().reverse().map(parent => parent.close).join(''));
      current = parents.map(parent => parent.open).join('');
      return;
    }
    if (!element || !element.hasChildNodes()) {
      current += serializer.serializeToString(node);
      return;
    }
    const open = serializer.serializeToString(element.cloneNode(false)).replace(/\/>$/, '>');
    const close = `</${element.tagName}>`;
    current += open;
    parents.push({ open, close });
    Array.from(element.childNodes).forEach(visit);
    parents.pop();
    current += close;
  }
  Array.from(root.childNodes).forEach(visit);
  return [...pages, current];
}

export async function extractWordPages(buffer: Buffer) {
  const input = await prepareWordBreaks(buffer).catch(() => ({ buffer, storedPages: NaN }));
  const images: EmbeddedImage[] = [];
  const { value } = await mammoth.convertToHtml({ buffer: input.buffer }, {
    styleMap: [`br[type='page'] => hr.${BREAK_CLASS}:fresh`],
    convertImage: mammoth.images.imgElement(async image => {
      if (!/^image\/(?:png|jpeg|gif|webp)$/.test(image.contentType) || images.length >= 4) return { src: '' };
      const base64 = await image.read('base64');
      if (base64.length > 2 * 1024 * 1024 * 4 / 3) return { src: '' };
      const index = images.push({ base64, mimeType: image.contentType }) - 1;
      return { src: `docsetu-embedded-${index}` };
    }),
  });
  const pages = splitWordPages(value).map((page, index) => ({
    pageNumber: index + 1,
    text: docxHtmlToText(page),
    images: [...page.matchAll(/<img\b[^>]*\bsrc="docsetu-embedded-(\d+)"/g)].map(([, index]) => images[Number(index)]),
  }));
  if (input.storedPages > pages.length) {
    return [{ pageNumber: 1, text: pages.map(page => page.text).filter(Boolean).join('\n\n'), images: pages.flatMap(page => page.images) }];
  }
  return pages;
}
