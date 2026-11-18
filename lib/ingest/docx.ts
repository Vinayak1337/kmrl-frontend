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
