#!/usr/bin/env tsx
/** Live local funnel test. Uses the demo login; always removes its own fixture.
 * API_URL defaults to localhost. All assertions, including cleanup, affect exit status.
 * Retrieval uses lexical relevance despite the legacy /api/search/vector URL.
 */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { testAuthCookie } from './testAuth';

const base = process.env.API_URL || 'http://localhost:3000';
const steps: string[] = [];
async function run() {
  const cookie = await testAuthCookie(base);
  const headers = { 'Content-Type': 'application/json', Cookie: cookie };
  async function api(path: string, body?: unknown, method = body ? 'POST' : 'GET') {
    const response = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(240000) });
    const data = await response.json();
    assert.ok(response.ok, `${method} ${path}: ${response.status} ${data.error || ''}`);
    return data;
  }
  function passed(step: string) { steps.push(step); console.log(`PASS: ${step}`); }
  let documentId: string | undefined;
  try {
    const ingest = await api('/api/documents/ingest', {
      title: 'TEST FIXTURE — Document funnel audit',
      documents: [{ type: 'html', filename: 'funnel-audit.html', content: '<h1>Fire safety training procedure</h1><p>TEST FIXTURE for a temporary workflow audit. All Operations staff must complete fire safety training by 31 January 2031. The Operations manager must record completion before publishing the compliance report. Unresolved training issues must be escalated to the Safety team.</p>' }],
      department: 'Operations', documentType: 'sop', language: 'English', tags: ['test-fixture'],
    });
    documentId = ingest.documentId;
    assert.ok(documentId, 'Ingestion must return a persisted document ID');
    assert.ok(ingest.nodeCount > 0, 'Ingestion must produce chunks');
    passed('ingestion');
    const saved = await api(`/api/documents/ingest?id=${documentId}`);
    assert.ok(saved.nodes?.some((node: { content: string }) => node.content.includes('31 January 2031')), 'Stored source must retain the deadline');
    passed('persisted source and chunks');
    const search = await api('/api/search/vector', { query: 'fire safety training', documentId, searchNodes: true, limit: 5 });
    assert.ok(search.results?.some((result: { documentId: string }) => result.documentId === documentId), 'Search must retrieve this fixture, not an unrelated document');
    passed('scoped lexical retrieval');
    const chat = await api('/api/chat', { docId: documentId, messages: [{ role: 'user', content: 'What is the fire safety training deadline? Answer in one sentence.' }] });
    assert.match(chat.reply, /2031/);
    assert.match(chat.reply, /31/);
    assert.equal(chat.generation, 'model', 'A passage fallback is not successful model synthesis');
    assert.ok(chat.citations?.some((citation: { docId: string }) => citation.docId === documentId));
    passed('document answer and source citation');
    const overview = await api('/api/chat', { docId: documentId, messages: [{ role: 'user', content: 'What is this document about?' }] });
    assert.equal(overview.generation, 'model');
    assert.ok(overview.citations?.length, 'Document overview must retrieve evidence rather than product help');
    passed('document intent regression');
    const hindiChat = await api('/api/chat', { docId: documentId, messages: [{ role: 'user', content: 'अग्नि सुरक्षा प्रशिक्षण की अंतिम तिथि क्या है? हिंदी में उत्तर दें।' }] });
    assert.equal(hindiChat.generation, 'model');
    assert.match(hindiChat.reply, /[\u0900-\u097f]/);
    assert.match(hindiChat.reply, /2031/);
    assert.ok(hindiChat.citations?.some((citation: { docId: string }) => citation.docId === documentId));
    passed('Hindi question over English source with citations');
    const history = await api(`/api/chat?docId=${documentId}`);
    assert.ok(history.messages?.some((message: { role: string; content: string }) => message.role === 'assistant' && message.content.includes('2031')));
    passed('conversation history');
    const translation = await api('/api/translate', { language: 'Hindi', summary: 'The training deadline is 31 January 2031.', keyPoints: [], actionableItems: [] });
    assert.match(translation.summary, /[\u0900-\u097f]/, 'Translation must contain Hindi text');
    assert.match(translation.summary, /2031/);
    assert.match(translation.summary, /31/);
    passed('live Hindi translation and numerical retention');
    const actions = await api('/api/actions');
    assert.ok(actions.actions?.some((action: { documentId: string }) => action.documentId === documentId));
    passed('extracted actions');
    const feedback = await api(`/api/documents/${documentId}/feedback`, { type: 'general', message: 'Verify source retention during reprocessing.', reprocess: true });
    assert.equal(feedback.reprocessed, true, 'Feedback acceptance alone does not prove reprocessing');
    const reprocessed = await api(`/api/documents/ingest?id=${documentId}`);
    assert.ok(reprocessed.nodes?.some((node: { content: string }) => node.content.includes('31 January 2031')));
    passed('feedback reprocessing and source retention');
  } finally {
    if (documentId) {
      await api(`/api/documents/${documentId}`, undefined, 'DELETE');
      passed('fixture cleanup');
    }
    if (process.env.TEST_REPORT_PATH) await writeFile(process.env.TEST_REPORT_PATH, JSON.stringify({ base, steps }, null, 2));
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
