import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractDeadlines, findAuthorities, findDates, parseDeadlineId, tierFor } from './deadlines';

const now = new Date(2026, 9, 7);

test('reads Indian, ISO and written dates', () => {
  assert.deepEqual(findDates('Submit by 12/10/2026, or 2026-10-20, or 5th November 2026, or Dec 1, 2026.').map(d => d.date),
    ['2026-10-12', '2026-10-20', '2026-11-05', '2026-12-01']);
  assert.deepEqual(findDates('Version 31/02/2026 is not a date.'), []);
});

test('only dated requirements become deadlines, nearest first, with authorities', () => {
  const deadlines = extractDeadlines([
    { docId: 'doc-1', nodeId: 'node-1', order: 1, title: 'Fire safety', content: 'The policy was approved on 1 January 2026.\nAll staff must complete fire safety training by 20 October 2026.\nSafety Officer: safety.officer@example.org' },
    { docId: 'doc-1', nodeId: 'node-2', order: 2, title: 'Renewal', content: 'The vendor licence expires on 2026-12-31. Contact procurement@example.org.', actionableItems: ['Renew the licence before 2026-12-31'] },
  ], { now });
  assert.deepEqual(deadlines.map(d => [d.date, d.tier, d.daysLeft]), [['2026-10-20', 'within15', 13], ['2026-12-31', 'later', 85]]);
  assert.equal(deadlines[0].authorities[0].email, 'safety.officer@example.org');
  assert.equal(deadlines[0].authorities[0].label, 'Safety Officer');
  assert.equal(deadlines[1].authorities[0].email, 'procurement@example.org');
  assert.equal(deadlines[1].requirement, 'Renew the licence before 2026-12-31');
  assert.match(deadlines[1].excerpt, /licence expires/);
  assert.deepEqual(parseDeadlineId(deadlines[0].id), { documentId: 'doc-1', sectionId: 'node-1', date: '2026-10-20' });
});

test('issue dates are not deadlines and authorities rank by proximity', () => {
  const [first, second] = extractDeadlines([{ docId: 'd', nodeId: 'n', content: 'Circular issued 1 October 2026 by the Chief Safety Officer. 1. Extinguisher inspection All controllers must submit the report by 10 October 2026. Chief Safety Officer: cso@example.org 2. Drill Each station must file the drill record no later than 19 October 2026. Station Manager: sm@example.org' }], { now });
  assert.deepEqual([first.date, second.date], ['2026-10-10', '2026-10-19']);
  assert.match(first.requirement, /^All controllers/);
  assert.equal(first.authorities[0].email, 'cso@example.org');
  assert.equal(second.authorities[0].email, 'sm@example.org');
  assert.equal(second.authorities[0].label, 'Station Manager');
});

test('old deadlines drop off and tiers follow 5/15/30 days', () => {
  assert.equal(extractDeadlines([{ docId: 'd', nodeId: 'n', content: 'Due by 1 January 2025.' }], { now }).length, 0);
  assert.deepEqual([-1, 0, 5, 6, 15, 16, 30, 31].map(tierFor), ['overdue', 'within5', 'within5', 'within15', 'within15', 'within30', 'within30', 'later']);
});

test('authority labels come from the fed text', () => {
  assert.deepEqual(findAuthorities('Escalate to the Station Controller (sc.aluva@example.org)'), [{ email: 'sc.aluva@example.org', label: 'Station Controller' }]);
});
