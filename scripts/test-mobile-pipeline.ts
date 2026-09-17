/** Live bearer transport test. Run only against a dedicated test workspace.
 * TEST_EMAIL/TEST_PASSWORD must identify a test administrator. Fixtures are removed.
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const base = process.env.API_URL || 'http://127.0.0.1:3100';
const credentials = { email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD };
async function request(path: string, token?: string, body?: unknown, method = body ? 'POST' : 'GET', status = 200) {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(240_000),
  });
  assert.equal(response.status, status, `${method} ${path}`);
  return response.json();
}
async function run() {
  assert.ok(credentials.email && credentials.password, 'Set TEST_EMAIL and TEST_PASSWORD for a dedicated test workspace');
  const admin = await request('/api/mobile/auth', undefined, credentials);
  assert.ok(admin.token && admin.expiresAt > Date.now());
  await request('/api/users', 'invalid-token', undefined, 'GET', 401);
  console.log('PASS native login and invalid bearer rejection');
  let documentId: string | undefined;
  let personId: string | undefined;
  try {
    const password = randomBytes(18).toString('hex');
    const email = `mobile-${Date.now()}@example.invalid`;
    const person = await request('/api/users', admin.token, { name: 'Temporary mobile access test', email, password, role: 'MANAGER', grants: [] }, 'POST', 201);
    personId = person.id;
    const manager = await request('/api/mobile/auth', undefined, { email, password });
    await request('/api/users', manager.token, undefined, 'GET', 403);
    const payload = {
      title: 'TEST FIXTURE — Mobile verification', department: 'Operations', documentType: 'sop', language: 'English', tags: ['test-fixture'],
      documents: [{ type: 'html', filename: 'mobile-test.html', content: '<h1>Safety training</h1><p>Operations staff must complete safety training by 31 January 2031. The Operations manager must record completion.</p>' }],
    };
    await request('/api/documents/ingest', manager.token, payload, 'POST', 403);
    console.log('PASS people creation and manager access boundaries');
    const ingested = await request('/api/documents/ingest', admin.token, payload, 'POST', 201);
    documentId = ingested.documentId;
    assert.ok(documentId);
    const document = await request(`/api/documents/ingest?id=${documentId}`, admin.token);
    assert.ok(document.nodes?.some((node: {content: string}) => node.content.includes('31 January 2031')));
    await request(`/api/documents/ingest?id=${documentId}`, manager.token, undefined, 'GET', 403);
    console.log('PASS ingestion, persisted source and document access boundary');
    const answer = await request('/api/chat', admin.token, { docId: documentId, messages: [{ role: 'user', content: 'What is the safety training deadline?' }] });
    assert.match(answer.reply, /2031/);
    assert.ok(['model', 'fallback'].includes(answer.generation));
    assert.ok(answer.citations?.length);
    const citation = answer.citations[0];
    const uid = citation.uid || citation.nodeId;
    assert.ok(uid, 'Citation must identify an exact node');
    await request(`/api/nodes/${encodeURIComponent(uid)}`, admin.token);
    const history = await request(`/api/chat?docId=${documentId}`, admin.token);
    assert.ok(history.messages.some((message: {role: string}) => message.role === 'assistant'));
    console.log(`PASS persisted answer and exact source (generation=${answer.generation})`);
    await request(`/api/documents/${documentId}/feedback`, admin.token, { type: 'general', message: 'Temporary verification feedback', reprocess: false });
    await request('/api/audit', admin.token);
    await request(`/api/documents/${documentId}`, manager.token, undefined, 'DELETE', 403);
    console.log('PASS feedback, audit and deletion access boundary');
  } finally {
    const cleanup = await Promise.allSettled([
      ...(documentId ? [request(`/api/documents/${documentId}`, admin.token, undefined, 'DELETE')] : []),
      ...(personId ? [request(`/api/users/${personId}`, admin.token, undefined, 'DELETE')] : []),
    ]);
    for (const result of cleanup) {
      if (result.status === 'rejected') throw result.reason;
    }
    console.log('PASS fixture cleanup');
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
