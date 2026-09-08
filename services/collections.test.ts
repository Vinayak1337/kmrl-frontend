import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { listDocuments, getDocument, getDocumentSections } from './documents';
import { listAllActions } from './actions';
import { listPeople } from './people';
import { listAuditEntries } from './audit';

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});
function respond(body: unknown, status = 200) {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin: 'https://workspace.example.test' } } });
  globalThis.fetch = async () => Response.json(body, { status });
}

test('real empty collections stay empty across workspace services', async () => {
  respond({ documents: [], actions: [], users: [], logs: [], totalCount: 0, total: 0 });
  assert.deepEqual((await listDocuments()).documents, []);
  assert.deepEqual(await listAllActions(), []);
  assert.deepEqual(await listPeople(), []);
  assert.deepEqual(await listAuditEntries(), { entries: [], total: 0 });
});

test('access and server errors are surfaced instead of sample data', async () => {
  for (const status of [401, 403, 500]) {
    respond({ error: 'Unavailable' }, status);
    await assert.rejects(listDocuments());
    await assert.rejects(listAllActions());
    await assert.rejects(listPeople());
    await assert.rejects(listAuditEntries());
    await assert.rejects(getDocument('doc-kmrl-test'));
    await assert.rejects(getDocumentSections('doc-kmrl-test'));
  }
});

test('collection filters reach the server and retain metadata and totals', async () => {
  respond({});
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('q'), 'review');
    assert.equal(url.searchParams.get('language'), 'Hindi');
    assert.equal(url.searchParams.get('page'), '1');
    return Response.json({ documents: [{ id: 'fixture', title: 'Review', language: 'hi', totalPages: 12 }], totalCount: 80, page: 1, pageSize: 50 });
  };
  const result = await listDocuments({ search: 'review', language: 'Hindi', page: 1, pageSize: 50 });
  assert.equal(result.documents[0].language, 'Hindi');
  assert.equal(result.documents[0].pageCount, 12);
  assert.equal(result.total, 80);
});
