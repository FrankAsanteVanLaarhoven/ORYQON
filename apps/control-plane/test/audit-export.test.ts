import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTenant } from '../src/security/tenant-context.ts';
import { verifyChain, exportAudit } from '../src/enterprise/audit-export.ts';
import type { AuditEntry } from '../src/enterprise/audit-export.ts';

function chain(tenantId = 't-a'): AuditEntry[] {
  return [
    { seq: 1, tenantId, action: 'CONTENT_PUBLISHED', prevDigest: '0000', digest: 'aaaa', at: '2026-07-19T10:00:00Z' },
    { seq: 2, tenantId, action: 'EVIDENCE_VALIDATED', prevDigest: 'aaaa', digest: 'bbbb', at: '2026-07-19T10:01:00Z' },
    { seq: 3, tenantId, action: 'RECEIPT_SIGNED', prevDigest: 'bbbb', digest: 'cccc', at: '2026-07-19T10:02:00Z' },
  ];
}

test('a continuous chain verifies intact', () => {
  const r = verifyChain(chain());
  assert.equal(r.intact, true);
  assert.equal(r.brokenAt, null);
  assert.equal(r.length, 3);
});

test('a broken prevDigest linkage is detected', () => {
  const c = chain();
  c[2].prevDigest = 'tampered';
  const r = verifyChain(c);
  assert.equal(r.intact, false);
  assert.equal(r.brokenAt, 3);
});

test('a sequence gap is detected', () => {
  const c = chain();
  c[2].seq = 5;
  assert.equal(verifyChain(c).intact, false);
});

test('an empty chain is trivially intact', () => {
  assert.deepEqual(verifyChain([]), { intact: true, brokenAt: null, length: 0 });
});

test('export is deterministic, content-addressed, and flags integrity', () => {
  withTenant('t-a', () => {
    const a = exportAudit(chain());
    const b = exportAudit(chain());
    assert.equal(a.sha256, b.sha256);
    assert.equal(a.sha256.length, 64);
    assert.equal(a.count, 3);
    assert.equal(a.firstDigest, 'aaaa');
    assert.equal(a.lastDigest, 'cccc');
    assert.equal(a.intact, true);
  });
});

test('export flags a broken chain rather than hiding it', () => {
  withTenant('t-a', () => {
    const c = chain();
    c[1].prevDigest = 'wrong';
    assert.equal(exportAudit(c).intact, false);
  });
});

test('an empty export carries null digests and a zero count', () => {
  withTenant('t-a', () => {
    const e = exportAudit([]);
    assert.equal(e.count, 0);
    assert.equal(e.firstDigest, null);
    assert.equal(e.lastDigest, null);
    assert.equal(e.intact, true);
  });
});

test('entries from another tenant fail closed', () => {
  withTenant('t-a', () => {
    assert.throws(() => exportAudit(chain('t-b')), /CROSS_TENANT_DENIED/);
  });
});

test('exporting without a tenant scope fails closed', () => {
  assert.throws(() => exportAudit(chain()), /TENANT_CONTEXT_MISSING/);
});
