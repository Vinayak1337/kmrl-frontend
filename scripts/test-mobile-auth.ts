import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import middleware from '../middleware';
import { signSession, verifySession, type JwtUser } from '../lib/auth';
import { canIngestDocument } from '../lib/documentPermissions';

const manager: JwtUser = { sub: 'test-manager', name: 'Test Manager', email: 'manager@example.test', role: 'MANAGER', grants: [{ dept: 'HR', type: 'POLICY', actions: ['read', 'ingest'] }] };
test('native bearer is bridged into existing route cookie authorization', async () => {
  const token = signSession(manager); const response = await middleware(new NextRequest('http://localhost/api/documents/ingest', { headers: { authorization: `Bearer ${token}`, cookie: 'kmrl_session=wrong-account' } }));
  assert.equal(response.headers.get('x-middleware-request-cookie'), `kmrl_session=${token}`);
  assert.equal(verifySession(token)?.sub, manager.sub);
});
test('invalid or expired native tokens never fall through to a valid browser session', async () => {
  for (const token of ['invalid', signSession(manager, { expiresIn: -1 }), jwt.sign(manager, process.env.AUTH_SECRET || 'dev-secret-change-me', { algorithm: 'HS384' })]) {
    const response = await middleware(new NextRequest('http://localhost/api/auth/session', { headers: { authorization: `Bearer ${token}`, cookie: `kmrl_session=${signSession(manager)}` } }));
    assert.equal(response.status, 401);
  }
});
test('cookie login and native login remain publicly reachable, workspace routes remain guarded', async () => {
  for (const path of ['/api/auth/login', '/api/mobile/auth']) assert.equal((await middleware(new NextRequest(`http://localhost${path}`))).status, 200);
  assert.equal((await middleware(new NextRequest('http://localhost/api/actions'))).status, 401);
});
test('native does not widen team/type ingestion grants', () => {
  assert.equal(canIngestDocument(manager, 'hr', 'policy'), true);
  assert.equal(canIngestDocument(manager, 'FINANCE', 'policy'), false);
  assert.equal(canIngestDocument(manager, 'HR', 'report'), false);
  assert.equal(canIngestDocument({ ...manager, grants: [{ dept: 'HR', type: 'POLICY', actions: ['read'] }] }, 'HR', 'policy'), false);
  assert.equal(canIngestDocument({ ...manager, role: 'ADMIN' }), true);
});
