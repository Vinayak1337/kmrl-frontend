import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveCorrectionScope, scopeFromNote } from '../corrections';

const sections = [
  { nodeId: 'pages-1-2', title: 'Operating context', pageRange: { start: 1, end: 2 } },
  { nodeId: 'pages-3-4', title: 'Vendor requirements', pageRange: { start: 3, end: 4 } },
];

test('notes resolve to a single section, a named page, or the document brief', () => {
  assert.deepEqual(scopeFromNote('Fix page 3.', sections), { kind: 'section', nodeId: 'pages-3-4', page: 3 });
  assert.deepEqual(scopeFromNote('Replace the finding in Vendor requirements.', sections), { kind: 'section', nodeId: 'pages-3-4' });
  assert.deepEqual(scopeFromNote('Add the finding on page 4 to the document brief.', sections), { kind: 'brief' });
  assert.equal(scopeFromNote('Fix pages 2–4.', sections), null);
  assert.equal(scopeFromNote('The summary is wrong.', sections), null);
  assert.deepEqual(deriveCorrectionScope('The summary is wrong.', 'pages-1-2', sections), { kind: 'section', nodeId: 'pages-1-2' });
  assert.equal(deriveCorrectionScope('Correct this section.', 'missing', sections), null);
});
