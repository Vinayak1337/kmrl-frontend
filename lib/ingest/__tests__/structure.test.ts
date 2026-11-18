import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { extractPdfPagesWithImagesFromBase64 } from '../../pdf';
import { chunkDocument } from '../chunker';
import { validateChunkCoverage } from '../validation';
import { buildPersistedChunk } from '../builder';
import JSZip from 'jszip';
import { docxHtmlToText, extractWordPages } from '../docx';
import type { NormalizedDocument } from '../normalization';

function document(pages: NormalizedDocument['pages']): NormalizedDocument {
  return { title: 'Test', filename: 'test', mimeType: 'text/plain', format: 'text', pageCount: pages.length, pages, fullText: '', rawContent: '' };
}

test('topic boundaries retain page attribution and ordered links', () => {
  const chunks = chunkDocument(document([
    { pageNumber: 1, text: '# Safety\n\nFirst topic.' },
    { pageNumber: 2, text: 'Continuation.\n\n# Operations\n\nSecond topic.' }
  ]));
  assert.equal(chunks.length, 2);
  assert.deepEqual(chunks[0].sourcePages, [1, 2]);
  assert.deepEqual(chunks[1].sourcePages, [2]);
  assert.doesNotMatch(chunks[1].text, /First topic/);
  assert.equal(chunks[0].nextChunkId, chunks[1].chunkId);
  assert.equal(chunks[1].previousChunkId, chunks[0].chunkId);
});

test('long content and image-only pages remain bounded and represented', () => {
  const image = { base64: 'abc', mimeType: 'image/png' };
  const chunks = chunkDocument(document([
    { pageNumber: 3, text: 'word '.repeat(4000), images: [image] },
    { pageNumber: 4, text: '', images: [image] }
  ]));
  assert.ok(chunks.every(chunk => chunk.characterCount <= 7500));
  assert.ok(chunks.some(chunk => chunk.sourcePages.includes(4) && chunk.images.length));
  assert.ok(chunks.every(chunk => chunk.sourcePages.includes(3)));
  assert.deepEqual(chunks.flatMap(chunk => chunk.images.map(image => image.page)), [3, 4]);
});

test('Word headings and table rows survive HTML conversion', () => {
  const text = docxHtmlToText('<h1>Safety &amp; Access</h1><p>Rules</p><table><tr><th>Name</th><th>Value</th></tr><tr><td><p>A</p></td><td><p>12</p></td></tr></table>');
  assert.match(text, /^# Safety & Access/);
  assert.match(text, /\| Name \| Value \|\n\| --- \| --- \|\n\| A \| 12 \|/);
});

test('the PDF.js Node renderer preserves page images within its quota', async () => {
  const fixture = new URL('../../../test-samples/real-data/kmrl-kerala-govt/kmrl_tender_contract_award_notice_KBC3.pdf', import.meta.url);
  const bytes = await readFile(fixture);
  const result = await extractPdfPagesWithImagesFromBase64(bytes.toString('base64'), { maxTextPageImages: 1, maxScanPageImages: 0 });
  assert.equal(result.pages.length, 4);
  assert.ok(result.pages[0].text.length > 0);
  const images = result.pages.flatMap(page => page.images);
  assert.equal(images.length, 1);
  assert.match(images[0].base64, /^iVBOR/);
});

test('PDF headings never split a page, and short neighboring pages share a section', () => {
  const normalized = { ...document([
    { pageNumber: 1, text: '# First heading\nFirst paragraph.\n# Second heading\nSecond paragraph.' },
    { pageNumber: 2, text: '# Third heading\nThird paragraph.' },
    { pageNumber: 3, text: 'A dense page. '.repeat(800) },
    { pageNumber: 4, text: '' },
  ]), format: 'pdf' as const };
  const chunks = chunkDocument(normalized);
  assert.deepEqual(chunks.map(chunk => chunk.sourcePages), [[1, 2], [3], [4]]);
  assert.equal(chunks[0].chunkId, 'pages-1-2');
  assert.match(chunks[0].text, /Second heading[\s\S]*\[Page 2\]/);
  assert.equal(chunks[1].text.trim(), `[Page 3]\n${normalized.pages[2].text.trim()}`);
  assert.equal(validateChunkCoverage(normalized, chunks).valid, true);
});

test('a model result with no actions stays empty', () => {
  const [chunk] = chunkDocument(document([{ pageNumber: 1, text: 'The authors review access in this research paper.' }]));
  assert.deepEqual(buildPersistedChunk(chunk, 'test', 1, {}, { actionableItems: [] }).actionableItems, []);
});

test('Word manual and saved page markers preserve distinct pages and avoid duplicate breaks', async () => {
  const archive = new JSZip();
  archive.file('[Content_Types].xml', `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="xml" ContentType="application/xml"/>
  </Types>`);
  archive.file('word/document.xml', `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
      <w:p><w:r><w:t>First page.</w:t><w:br w:type="page"/><w:lastRenderedPageBreak/><w:t>Second page.</w:t></w:r></w:p>
      <w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t>Third page.</w:t></w:r></w:p>
      <w:p><w:r><w:lastRenderedPageBreak/><w:t>Fourth page.</w:t></w:r></w:p>
    </w:body>
  </w:document>`);
  const pages = await extractWordPages(await archive.generateAsync({ type: 'nodebuffer' }));
  assert.deepEqual(pages.map(page => page.text), ['First page.', 'Second page.', 'Third page.', 'Fourth page.']);
  const normalized = { ...document(pages), format: 'doc' as const };
  const chunks = chunkDocument(normalized);
  assert.deepEqual(chunks.flatMap(chunk => chunk.sourcePages), [1, 2, 3, 4]);
  assert.ok(validateChunkCoverage(normalized, chunks).valid);

  archive.file('docProps/app.xml', '<Properties><Pages>8</Pages></Properties>');
  const incompletePages = await extractWordPages(await archive.generateAsync({ type: 'nodebuffer' }));
  assert.equal(incompletePages.length, 1);
  assert.match(incompletePages[0].text, /First page.[\s\S]*Fourth page./);
});
