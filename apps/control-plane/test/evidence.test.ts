import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTenant } from '../src/security/tenant-context.ts';
import { EvidenceStore, EvidenceError } from '../src/products/evidence-store.ts';
import type { EvidenceInput } from '../src/products/evidence-store.ts';

const base: EvidenceInput = {
  kind: 'DOCUMENT',
  source: 'lab-report',
  statement: 'Waterproof to 10,000mm',
  content: { mm: 10000 },
  capturedAt: '2026-07-19T10:00:00Z',
};

test('record returns a frozen, content-addressed attestation', () => {
  withTenant('tenant-a', () => {
    const store = new EvidenceStore();
    const rec = store.record(base);
    assert.equal(rec.tenantId, 'tenant-a');
    assert.match(rec.evidenceId, /^ev_/);
    assert.equal(rec.contentHash.length, 64);
    assert.equal(Object.isFrozen(rec), true);
    assert.throws(() => {
      rec.statement = 'tampered';
    }, TypeError);
  });
});

test('an identical attestation is idempotent — same id, one record', () => {
  withTenant('tenant-a', () => {
    const store = new EvidenceStore();
    const a = store.record(base);
    const b = store.record(base);
    assert.equal(a.evidenceId, b.evidenceId);
    assert.equal(store.size(), 1);
  });
});

test('different content yields a different hash and id', () => {
  withTenant('tenant-a', () => {
    const store = new EvidenceStore();
    const a = store.record({ ...base, content: { mm: 10000 } });
    const b = store.record({ ...base, content: { mm: 5000 } });
    assert.notEqual(a.contentHash, b.contentHash);
    assert.notEqual(a.evidenceId, b.evidenceId);
  });
});

test('content hashing is order-independent (canonical)', () => {
  withTenant('tenant-a', () => {
    const store = new EvidenceStore();
    const a = store.record({ ...base, content: { x: 1, y: 2 } });
    const b = store.record({ ...base, content: { y: 2, x: 1 } });
    assert.equal(a.contentHash, b.contentHash);
  });
});

test('evidence is tenant-scoped — cross-tenant reads fail closed', () => {
  const store = new EvidenceStore();
  const id = withTenant('tenant-a', () => store.record(base).evidenceId);
  withTenant('tenant-b', () => {
    assert.equal(store.get(id), null);
    assert.equal(store.has(id), false);
  });
  withTenant('tenant-a', () => {
    assert.ok(store.get(id));
  });
});

test('recording without a tenant scope fails closed', () => {
  const store = new EvidenceStore();
  assert.throws(() => store.record(base), /TENANT_CONTEXT_MISSING/);
});

test('verifyIntegrity confirms matching content and rejects drift', () => {
  withTenant('tenant-a', () => {
    const store = new EvidenceStore();
    const rec = store.record({ ...base, content: { mm: 10000 } });
    assert.equal(store.verifyIntegrity(rec.evidenceId, { mm: 10000 }), true);
    assert.equal(store.verifyIntegrity(rec.evidenceId, { mm: 9999 }), false);
    assert.equal(store.verifyIntegrity('ev_unknown', { mm: 10000 }), false);
  });
});

test('an invalid kind or empty field is rejected', () => {
  withTenant('tenant-a', () => {
    const store = new EvidenceStore();
    assert.throws(() => store.record({ ...base, kind: 'BOGUS' } as unknown as EvidenceInput), EvidenceError);
    assert.throws(() => store.record({ ...base, source: '' }), EvidenceError);
    assert.throws(() => store.record({ ...base, capturedAt: '' }), EvidenceError);
  });
});
