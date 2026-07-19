import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTenant } from '../src/security/tenant-context.ts';
import { EvidenceStore } from '../src/products/evidence-store.ts';
import type { EvidenceInput } from '../src/products/evidence-store.ts';
import { ProductPassport } from '../src/products/product-passport.ts';
import { evaluatePolicy } from '../src/policy/policy-engine.ts';

const evInput: EvidenceInput = {
  kind: 'CERTIFICATION',
  source: 'cert-body',
  statement: 'Waterproof to 10,000mm',
  content: { mm: 10000 },
  capturedAt: '2026-07-19T10:00:00Z',
};

function setup() {
  const store = new EvidenceStore();
  const passport = new ProductPassport('prod-1', store);
  return { store, passport };
}

test('attaching evidence verifies a claim', () => {
  withTenant('t-a', () => {
    const { store, passport } = setup();
    const claim = passport.addClaim({ attribute: 'waterproof', value: '10000mm', required: true });
    const ev = store.record(evInput);
    passport.attachEvidence(claim.claimId, ev.evidenceId);
    const got = passport.getClaim(claim.claimId);
    assert.equal(got?.status, 'VERIFIED');
    assert.deepEqual(got?.evidenceIds, [ev.evidenceId]);
  });
});

test('the same attribute cannot be claimed twice', () => {
  withTenant('t-a', () => {
    const { passport } = setup();
    passport.addClaim({ attribute: 'waterproof', value: '10000mm' });
    assert.throws(() => passport.addClaim({ attribute: 'waterproof', value: '8000mm' }), /CLAIM_EXISTS/);
  });
});

test('attaching unknown evidence fails closed', () => {
  withTenant('t-a', () => {
    const { passport } = setup();
    const claim = passport.addClaim({ attribute: 'waterproof', value: '10000mm' });
    assert.throws(() => passport.attachEvidence(claim.claimId, 'ev_missing'), /EVIDENCE_NOT_FOUND/);
  });
});

test('publish fails closed when a required claim is unverified', () => {
  withTenant('t-a', () => {
    const { passport } = setup();
    passport.addClaim({ attribute: 'waterproof', value: '10000mm', required: true });
    assert.throws(() => passport.publish('1.0.0'), /PUBLISH_WITHOUT_EVIDENCE/);
    assert.equal(passport.status(), 'DRAFT');
  });
});

test('publish succeeds when every required claim is verified, then freezes', () => {
  withTenant('t-a', () => {
    const { store, passport } = setup();
    const claim = passport.addClaim({ attribute: 'waterproof', value: '10000mm', required: true });
    passport.attachEvidence(claim.claimId, store.record(evInput).evidenceId);
    passport.publish('1.0.0');
    assert.equal(passport.status(), 'PUBLISHED');
    assert.equal(passport.publishedVersion(), '1.0.0');
    assert.throws(() => passport.addClaim({ attribute: 'colour', value: 'slate' }), /NOT_DRAFT/);
  });
});

test('an optional unverified claim does not block publish', () => {
  withTenant('t-a', () => {
    const { store, passport } = setup();
    const req = passport.addClaim({ attribute: 'waterproof', value: '10000mm', required: true });
    passport.addClaim({ attribute: 'colour', value: 'slate', required: false });
    passport.attachEvidence(req.claimId, store.record(evInput).evidenceId);
    passport.publish('1.0.0');
    assert.equal(passport.status(), 'PUBLISHED');
  });
});

test('a passport used from another tenant fails closed', () => {
  const passport = withTenant('t-a', () => new ProductPassport('prod-1', new EvidenceStore()));
  withTenant('t-b', () => {
    assert.throws(() => passport.addClaim({ attribute: 'x', value: 'y' }), /CROSS_TENANT_DENIED/);
    assert.throws(() => passport.status(), /CROSS_TENANT_DENIED/);
  });
});

test('evidence from another tenant cannot be attached', () => {
  const store = new EvidenceStore();
  const foreignId = withTenant('t-b', () => store.record(evInput).evidenceId);
  withTenant('t-a', () => {
    const passport = new ProductPassport('prod-1', store);
    const claim = passport.addClaim({ attribute: 'waterproof', value: '10000mm' });
    assert.throws(() => passport.attachEvidence(claim.claimId, foreignId), /EVIDENCE_NOT_FOUND/);
  });
});

test('a published passport can be withdrawn but not re-published', () => {
  withTenant('t-a', () => {
    const { store, passport } = setup();
    const claim = passport.addClaim({ attribute: 'waterproof', value: '10000mm', required: true });
    passport.attachEvidence(claim.claimId, store.record(evInput).evidenceId);
    passport.publish('1.0.0');
    passport.withdraw();
    assert.equal(passport.status(), 'WITHDRAWN');
    assert.throws(() => passport.publish('1.1.0'), /NOT_DRAFT/);
  });
});

test('withdraw requires a published passport', () => {
  withTenant('t-a', () => {
    const { passport } = setup();
    assert.throws(() => passport.withdraw(), /NOT_PUBLISHED/);
  });
});

test('hasRequiredEvidence gates the policy engine PUBLISH_CONTENT decision', () => {
  withTenant('t-a', () => {
    const { store, passport } = setup();
    const claim = passport.addClaim({ attribute: 'waterproof', value: '10000mm', required: true });

    let d = evaluatePolicy(
      { actionType: 'PUBLISH_CONTENT', riskClass: 1, hasEvidence: passport.hasRequiredEvidence(), expired: false },
      'v1',
    );
    assert.equal(d.decision, 'DENY');
    assert.equal(d.reason, 'PUBLISH_WITHOUT_EVIDENCE');

    passport.attachEvidence(claim.claimId, store.record(evInput).evidenceId);
    d = evaluatePolicy(
      { actionType: 'PUBLISH_CONTENT', riskClass: 1, hasEvidence: passport.hasRequiredEvidence(), expired: false },
      'v1',
    );
    assert.notEqual(d.reason, 'PUBLISH_WITHOUT_EVIDENCE');
  });
});
