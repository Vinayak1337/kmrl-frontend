import assert from 'node:assert/strict';
import test from 'node:test';
import { validJobPayload } from '../jobs';

test('background jobs accept exactly one supported, bounded source', () => {
  assert.equal(validJobPayload({ documents: [{ type: 'text', content: 'A document' }] }), true);
  assert.equal(validJobPayload({ documents: [] }), false);
  assert.equal(validJobPayload({ documents: [{ type: 'text', content: 'A' }, { type: 'text', content: 'B' }] }), false);
  assert.equal(validJobPayload({ documents: [{ type: 'unknown', content: 'A' }] }), false);
  assert.equal(validJobPayload({ documents: [{ type: 'text', content: 'a'.repeat(5 * 1024 * 1024) }] }), false);
});
