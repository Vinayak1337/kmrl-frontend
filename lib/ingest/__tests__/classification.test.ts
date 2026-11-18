import test from 'node:test';
import assert from 'node:assert/strict';
import { classificationSuggestion, classificationView, validateClassification } from '../classification';
import { enrichChunks } from '../enrich';
import type { DocumentChunk } from '../chunker';
import type { DocumentRecord } from '@/types/documents';

test('suggestions reject unknown labels and malformed tags without changing effective fields', () => {
  const suggestion = classificationSuggestion({ nodes: [], overallMd: '', departments: ['Engineering', 'forged'], documentType: 'incident report', tags: ['rail', 'rail'] });
  assert.deepEqual(suggestion, { department: 'ENGINEERING', documentType: 'incident_report', tags: ['rail'], source: 'oci' });
  assert.equal(classificationSuggestion({ nodes: [], overallMd: '', departments: ['unknown'], documentType: 'unknown', tags: [42] as unknown as string[] }), null);
  const doc = { metadata: { department: 'HR', documentType: 'POLICY', tags: [] }, classificationSuggestion: suggestion } as unknown as DocumentRecord;
  assert.equal(classificationView(doc).effective.department, 'HR');
  assert.deepEqual(validateClassification({ department: 'Finance', documentType: 'Technical Document', tags: [] }), { department: 'FINANCE', documentType: 'technical document', tags: [] });
  assert.equal(validateClassification({ department: 'bogus', documentType: 'POLICY', tags: [] }), null);
});

test('provider failure yields no suggestion and enrichment falls back', async () => {
  const oldFetch = globalThis.fetch;
  const oldBase = process.env.AI_BASE_URL;
  const oldKey = process.env.AI_API_KEY;
  process.env.AI_BASE_URL = 'https://mock.invalid';
  process.env.AI_API_KEY = 'test';
  globalThis.fetch = async () => { throw new Error('mock provider unavailable'); };
  try {
    const analysis = await enrichChunks([{ order: 1, pageStart: 1, pageEnd: 1, text: 'A document with enough text.' } as DocumentChunk], {});
    assert.equal(analysis, null);
    assert.equal(classificationSuggestion(analysis), null);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldBase === undefined) delete process.env.AI_BASE_URL; else process.env.AI_BASE_URL = oldBase;
    if (oldKey === undefined) delete process.env.AI_API_KEY; else process.env.AI_API_KEY = oldKey;
  }
});
