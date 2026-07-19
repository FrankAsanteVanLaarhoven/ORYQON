import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  requireStepUp,
  isPrivileged,
  type AuthContext,
} from '../src/auth/step-up.ts';

const NOW = Date.parse('2026-07-19T12:00:00Z');
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

test('privileged actions are identified by type or risk class', () => {
  assert.equal(isPrivileged({ actionType: 'PRICE_CHANGE', riskClass: 1 }), true);
  assert.equal(isPrivileged({ actionType: 'PUBLISH_CONTENT', riskClass: 5 }), true);
  assert.equal(isPrivileged({ actionType: 'IMPORT_PRODUCT', riskClass: 1 }), false);
});

test('a non-privileged action needs no step-up', () => {
  const auth: AuthContext = { actorId: 'u1', aal: 1 };
  assert.deepEqual(requireStepUp({ actionType: 'IMPORT_PRODUCT', riskClass: 1 }, auth, NOW), { ok: true });
});

test('a privileged action with no step-up is refused', () => {
  const auth: AuthContext = { actorId: 'u1', aal: 1 };
  assert.deepEqual(requireStepUp({ actionType: 'PRICE_CHANGE', riskClass: 4 }, auth, NOW), {
    ok: false,
    reason: 'STEP_UP_REQUIRED',
  });
});

test('a fresh, sufficiently strong step-up admits a privileged action', () => {
  const auth: AuthContext = { actorId: 'u1', aal: 1, stepUp: { at: iso(60_000), aal: 2 } };
  assert.deepEqual(requireStepUp({ actionType: 'REFUND_ISSUE', riskClass: 3 }, auth, NOW), { ok: true });
});

test('a stale step-up is rejected', () => {
  const auth: AuthContext = { actorId: 'u1', aal: 1, stepUp: { at: iso(10 * 60_000), aal: 2 } };
  assert.deepEqual(requireStepUp({ actionType: 'ROLE_GRANT', riskClass: 5 }, auth, NOW), {
    ok: false,
    reason: 'STEP_UP_EXPIRED',
  });
});

test('a too-weak step-up is rejected', () => {
  const auth: AuthContext = { actorId: 'u1', aal: 1, stepUp: { at: iso(60_000), aal: 1 } };
  assert.deepEqual(requireStepUp({ actionType: 'POLICY_ACTIVATE', riskClass: 6 }, auth, NOW), {
    ok: false,
    reason: 'STEP_UP_INSUFFICIENT_AAL',
  });
});
