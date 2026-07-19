import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTenant } from '../src/security/tenant-context.ts';
import { MetricsStore } from '../src/analytics/metrics-store.ts';
import type { AnalyticsEvent } from '../src/analytics/metrics-store.ts';
import { AnalyticsError } from '../src/analytics/rollup.ts';

function ev(over: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return { tenantId: 't-a', metric: 'policy.decision', dimension: 'ALLOW', at: '2026-07-19T10:00:00Z', ...over };
}

test('ingest accumulates counts; breakdown, total and rate read them back', () => {
  withTenant('t-a', () => {
    const store = new MetricsStore();
    store.ingest(ev({ dimension: 'ALLOW' }));
    store.ingest(ev({ dimension: 'ALLOW' }));
    store.ingest(ev({ dimension: 'DENY' }));
    store.ingest(ev({ dimension: 'REVIEW' }));
    assert.equal(store.count('policy.decision', 'ALLOW'), 2);
    assert.equal(store.total('policy.decision'), 4);
    assert.deepEqual(store.breakdown('policy.decision'), { ALLOW: 2, DENY: 1, REVIEW: 1 });
    assert.equal(store.rate('policy.decision', 'ALLOW'), 0.5);
    assert.equal(store.size(), 4);
  });
});

test('a supplied value is summed instead of a unit count', () => {
  withTenant('t-a', () => {
    const store = new MetricsStore();
    store.ingest(ev({ metric: 'revenue', dimension: 'today', value: 120 }));
    store.ingest(ev({ metric: 'revenue', dimension: 'today', value: 8.5 }));
    assert.equal(store.count('revenue', 'today'), 128.5);
  });
});

test('decisionMixFor summarises a decision metric', () => {
  withTenant('t-a', () => {
    const store = new MetricsStore();
    store.ingest(ev({ dimension: 'ALLOW' }));
    store.ingest(ev({ dimension: 'ALLOW' }));
    store.ingest(ev({ dimension: 'ALLOW' }));
    store.ingest(ev({ dimension: 'REVIEW' }));
    const mix = store.decisionMixFor('policy.decision');
    assert.equal(mix.total, 4);
    assert.equal(mix.allow, 3);
    assert.equal(mix.allowRate, 0.75);
  });
});

test('metrics are tenant-scoped — writes and reads are isolated', () => {
  const store = new MetricsStore();
  withTenant('t-a', () => store.ingest(ev({ dimension: 'ALLOW' })));
  withTenant('t-b', () => {
    store.ingest(ev({ tenantId: 't-b', dimension: 'DENY' }));
    assert.equal(store.count('policy.decision', 'ALLOW'), 0); // A's data invisible here
    assert.equal(store.count('policy.decision', 'DENY'), 1);
  });
  withTenant('t-a', () => {
    assert.equal(store.count('policy.decision', 'ALLOW'), 1);
    assert.equal(store.count('policy.decision', 'DENY'), 0);
  });
});

test('ingesting an event for another tenant fails closed', () => {
  withTenant('t-a', () => {
    const store = new MetricsStore();
    assert.throws(() => store.ingest(ev({ tenantId: 't-b' })), /CROSS_TENANT_DENIED/);
  });
});

test('an event missing metric or dimension is rejected', () => {
  withTenant('t-a', () => {
    const store = new MetricsStore();
    assert.throws(() => store.ingest(ev({ metric: '' })), AnalyticsError);
    assert.throws(() => store.ingest(ev({ dimension: '' })), AnalyticsError);
  });
});

test('reading without a tenant scope fails closed', () => {
  const store = new MetricsStore();
  assert.throws(() => store.count('policy.decision', 'ALLOW'), /TENANT_CONTEXT_MISSING/);
});
