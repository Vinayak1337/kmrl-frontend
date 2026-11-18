import assert from 'node:assert/strict';
import test from 'node:test';
import { chunkDocument } from '../chunker';
import { docxHtmlToText } from '../docx';
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
