import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countBy, ratio, decisionMix, topN, windowBuckets, AnalyticsError } from '../src/analytics/rollup.ts';

test('countBy tallies items by a key function', () => {
  const items = [{ s: 'A' }, { s: 'B' }, { s: 'A' }, { s: 'A' }];
  assert.deepEqual(countBy(items, (i) => i.s), { A: 3, B: 1 });
});

test('ratio guards against divide-by-zero', () => {
  assert.equal(ratio(3, 4), 0.75);
  assert.equal(ratio(1, 0), 0);
});

test('decisionMix computes ALLOW/DENY/REVIEW counts and rates', () => {
  const m = decisionMix({ ALLOW: 3, DENY: 1, REVIEW: 2 });
  assert.equal(m.total, 6);
  assert.equal(m.allow, 3);
  assert.equal(m.allowRate, 0.5);
  assert.ok(Math.abs(m.denyRate - 1 / 6) < 1e-9);
  assert.ok(Math.abs(m.reviewRate - 1 / 3) < 1e-9);
});

test('decisionMix on empty input is all zeros', () => {
  const m = decisionMix({});
  assert.equal(m.total, 0);
  assert.equal(m.allowRate, 0);
});

test('topN returns the largest counts, ties broken by key, bounded by n', () => {
  const counts = { deny_a: 5, deny_b: 5, deny_c: 2, deny_d: 9 };
  assert.deepEqual(topN(counts, 2), [
    { key: 'deny_d', count: 9 },
    { key: 'deny_a', count: 5 },
  ]);
  assert.equal(topN(counts, 99).length, 4);
  assert.deepEqual(topN(counts, 0), []);
});

test('windowBuckets deterministically buckets by supplied origin/window', () => {
  const origin = Date.parse('2026-07-19T00:00:00Z');
  const hour = 3_600_000;
  const events = [
    { at: '2026-07-19T00:30:00Z' }, // bucket 0
    { at: '2026-07-19T01:15:00Z' }, // bucket 1
    { at: '2026-07-19T01:45:00Z' }, // bucket 1
    { at: '2026-07-19T02:00:00Z' }, // bucket 2
    { at: '2026-07-18T23:00:00Z' }, // before origin — ignored
    { at: 'not-a-date' }, // ignored
  ];
  assert.deepEqual(windowBuckets(events, hour, origin), { 0: 1, 1: 2, 2: 1 });
});

test('windowBuckets rejects a non-positive window', () => {
  assert.throws(() => windowBuckets([], 0, 0), AnalyticsError);
});
