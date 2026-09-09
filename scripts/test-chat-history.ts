import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { testAuthCookie } from './testAuth';

async function run() {
  const base = process.env.API_URL || 'http://localhost:3000';
  const cookie = await testAuthCookie(base);
  const sessionId = randomUUID();
  const docId = `test-chat-scope-${randomUUID()}`;
  const headers = { 'Content-Type': 'application/json', Cookie: cookie };
  async function request(path: string, body?: unknown, method = body ? 'POST' : 'GET') {
    const response = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json() };
  }
  try {
    const invalid = await request('/api/chat', { sessionId: { $ne: null }, messages: [{ role: 'user', content: 'hello' }] });
    assert.equal(invalid.status, 400);
    for (let i = 0; i < 2; i++) {
      const result = await request('/api/chat', { sessionId, docId, messages: [{ role: 'user', content: 'hello' }] });
      assert.equal(result.status, 200);
      assert.equal(result.data.generation, 'direct');
    }
    const scoped = await request(`/api/chat?sessionId=${sessionId}&docId=${docId}`);
    assert.equal(scoped.data.messages.length, 4, 'Repeated user turns must be retained exactly once');
    const global = await request('/api/chat', { sessionId, messages: [{ role: 'user', content: 'hello' }] });
    assert.equal(global.status, 200);
    const globalHistory = await request(`/api/chat?sessionId=${sessionId}`);
    assert.equal(globalHistory.data.messages.length, 2);
    const preserved = await request(`/api/chat?sessionId=${sessionId}&docId=${docId}`);
    assert.equal(preserved.data.messages.length, 4, 'Global history must not overwrite document history');
    console.log('PASS: live request validation, repeated turns and global/document history isolation');
  } finally {
    const cleanup = await request(`/api/chat?sessionId=${sessionId}`, undefined, 'DELETE');
    assert.equal(cleanup.status, 200);
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
