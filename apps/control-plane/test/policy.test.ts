import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PolicyRegistry,
  PolicyImmutabilityError,
  type PolicyBundle,
} from '../src/policy/policy-registry.ts';
import { evaluatePolicy, evaluateWithRegistry } from '../src/policy/policy-engine.ts';

function bundle(version: string): PolicyBundle {
  return { version, rules: { defaultDeny: true, notes: { a: 1 } } };
}

// ---- registry immutability ----

test('a version cannot be registered twice', () => {
  const reg = new PolicyRegistry();
  reg.registerDraft(bundle('1.0.0'));
  assert.throws(() => reg.registerDraft(bundle('1.0.0')), PolicyImmutabilityError);
});

test('activation deep-freezes the bundle — it is immutable thereafter', () => {
  const reg = new PolicyRegistry();
  const b = bundle('1.0.0');
  reg.registerDraft(b);
  reg.activate('1.0.0');

  assert.equal(Object.isFrozen(b), true);
  assert.equal(Object.isFrozen(b.rules), true);
  assert.throws(() => {
    (b.rules as Record<string, unknown>).defaultDeny = false;
  }, TypeError);
  assert.throws(() => {
    (b.rules.notes as Record<string, unknown>).a = 2;
  }, TypeError);
});

test('activating a new version retires the previous active one', () => {
  const reg = new PolicyRegistry();
  reg.registerDraft(bundle('1.0.0'));
  reg.registerDraft(bundle('1.1.0'));
  reg.activate('1.0.0');
  reg.activate('1.1.0');
  assert.equal(reg.status('1.0.0'), 'RETIRED');
  assert.equal(reg.status('1.1.0'), 'ACTIVE');
  assert.equal(reg.getActiveVersion(), '1.1.0');
  assert.throws(() => reg.activate('1.0.0'), PolicyImmutabilityError);
});

// ---- default-deny engine ----

const base = { actionType: 'PUBLISH_CONTENT', riskClass: 1, hasEvidence: true, expired: false };

test('expired actions are denied', () => {
  assert.equal(evaluatePolicy({ ...base, expired: true }, 'v1').decision, 'DENY');
});

test('publishing without evidence is denied', () => {
  const r = evaluatePolicy({ ...base, hasEvidence: false }, 'v1');
  assert.equal(r.decision, 'DENY');
  assert.equal(r.reason, 'PUBLISH_WITHOUT_EVIDENCE');
});

test('high-risk publish or price actions require review', () => {
  assert.equal(evaluatePolicy({ ...base, riskClass: 5 }, 'v1').decision, 'REVIEW');
  assert.equal(
    evaluatePolicy({ actionType: 'PRICE_CHANGE', riskClass: 4, hasEvidence: true, expired: false }, 'v1').decision,
    'REVIEW',
  );
});

test('low-risk import or compilation is allowed', () => {
  assert.equal(
    evaluatePolicy({ actionType: 'IMPORT_PRODUCT', riskClass: 1, hasEvidence: false, expired: false }, 'v1').decision,
    'ALLOW',
  );
});

test('anything unmatched is denied by default', () => {
  assert.equal(
    evaluatePolicy({ actionType: 'SOMETHING_NEW', riskClass: 2, hasEvidence: true, expired: false }, 'v1').decision,
    'DENY',
  );
});

test('the decision carries the active policy version; no active policy denies', () => {
  const reg = new PolicyRegistry();
  assert.equal(evaluateWithRegistry(reg, base).decision, 'DENY');
  assert.equal(evaluateWithRegistry(reg, base).reason, 'NO_ACTIVE_POLICY');

  reg.registerDraft(bundle('2.0.0'));
  reg.activate('2.0.0');
  const r = evaluateWithRegistry(reg, { actionType: 'IMPORT_PRODUCT', riskClass: 1, hasEvidence: false, expired: false });
  assert.equal(r.decision, 'ALLOW');
  assert.equal(r.policyVersion, '2.0.0');
});
