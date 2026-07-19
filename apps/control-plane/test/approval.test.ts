import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTenant } from '../src/security/tenant-context.ts';
import { raiseApproval, authorise, deny, ApprovalStore } from '../src/approvals/approval.ts';
import type { RaiseSpec } from '../src/approvals/approval.ts';
import type { Actor, Role } from '../src/rbac/roles.ts';
import type { AuthContext } from '../src/auth/step-up.ts';
import { evaluatePolicy } from '../src/policy/policy-engine.ts';
import { canTransition, transition } from '../src/idempotency/action-proposal.ts';
import type { ActionProposal } from '../src/idempotency/action-proposal.ts';

const NOW = Date.parse('2026-07-19T10:00:00Z');

const approver: Actor = { actorId: 'appr-1', roles: new Set<Role>(['APPROVER']) };
const operator: Actor = { actorId: 'op-1', roles: new Set<Role>(['OPERATOR']) };

const freshStepUp: AuthContext = { actorId: 'appr-1', aal: 2, stepUp: { at: '2026-07-19T09:58:00Z', aal: 2 } };
const noStepUp: AuthContext = { actorId: 'appr-1', aal: 1 };
const weakStepUp: AuthContext = { actorId: 'appr-1', aal: 1, stepUp: { at: '2026-07-19T09:59:00Z', aal: 1 } };
const staleStepUp: AuthContext = { actorId: 'appr-1', aal: 2, stepUp: { at: '2026-07-19T09:50:00Z', aal: 2 } };

function raise(over: Partial<RaiseSpec> = {}) {
  return raiseApproval({
    approvalId: 'ap-1',
    actionType: 'PUBLISH_CONTENT',
    riskClass: 2,
    requestedBy: 'op-1',
    proposalKey: 'k1',
    expiresAt: '2099-01-01T00:00:00Z',
    ...over,
  });
}

test('raising an approval produces a PENDING request stamped with the tenant', () => {
  withTenant('t-a', () => {
    const r = raise();
    assert.equal(r.state, 'PENDING');
    assert.equal(r.tenantId, 't-a');
    assert.equal(r.decidedBy, null);
  });
});

test('a non-privileged approval needs a qualified approver but no step-up', () => {
  withTenant('t-a', () => {
    const r = authorise(raise(), approver, noStepUp, NOW);
    assert.equal(r.ok, true);
    assert.equal(r.request.state, 'AUTHORISED');
    assert.equal(r.request.decidedBy, 'appr-1');
  });
});

test('an approver cannot approve their own proposal', () => {
  withTenant('t-a', () => {
    const r = authorise(raise({ requestedBy: 'appr-1' }), approver, noStepUp, NOW);
    assert.equal(r.reason, 'SELF_APPROVAL_FORBIDDEN');
  });
});

test('an actor without the approve permission is refused', () => {
  withTenant('t-a', () => {
    const r = authorise(raise(), operator, noStepUp, NOW);
    assert.equal(r.reason, 'NOT_AUTHORISED_TO_APPROVE');
  });
});

test('a high-risk approval demands a fresh, strong step-up', () => {
  withTenant('t-a', () => {
    const hi = () => raise({ actionType: 'PRICE_CHANGE', riskClass: 4 });
    assert.equal(authorise(hi(), approver, noStepUp, NOW).reason, 'STEP_UP_REQUIRED');
    assert.equal(authorise(hi(), approver, weakStepUp, NOW).reason, 'STEP_UP_INSUFFICIENT_AAL');
    assert.equal(authorise(hi(), approver, staleStepUp, NOW).reason, 'STEP_UP_EXPIRED');
    const ok = authorise(hi(), approver, freshStepUp, NOW);
    assert.equal(ok.ok, true);
    assert.equal(ok.request.state, 'AUTHORISED');
  });
});

test('deny records a decision; a decided request is not pending', () => {
  withTenant('t-a', () => {
    const d = deny(raise(), approver, NOW);
    assert.equal(d.request.state, 'DENIED');
    const again = authorise(d.request, approver, noStepUp, NOW);
    assert.equal(again.reason, 'NOT_PENDING');
  });
});

test('an expired request cannot be authorised', () => {
  withTenant('t-a', () => {
    const r = authorise(raise({ expiresAt: '2020-01-01T00:00:00Z' }), approver, noStepUp, NOW);
    assert.equal(r.reason, 'EXPIRED');
    assert.equal(r.request.state, 'EXPIRED');
  });
});

test('the store is tenant-scoped and lists pending approvals', () => {
  const store = new ApprovalStore();
  const req = withTenant('t-a', () => {
    const r = raise();
    store.put(r);
    return r;
  });
  withTenant('t-a', () => {
    assert.equal(store.get('ap-1')?.state, 'PENDING');
    assert.equal(store.listPending().length, 1);
  });
  withTenant('t-b', () => {
    assert.equal(store.get('ap-1'), null);
    assert.equal(store.listPending().length, 0);
    assert.throws(() => store.put(req), /CROSS_TENANT_DENIED/);
  });
});

test('full flow: policy REVIEW -> approval -> the proposal advances to AUTHORISED', () => {
  withTenant('t-a', () => {
    const policy = evaluatePolicy(
      { actionType: 'PRICE_CHANGE', riskClass: 4, hasEvidence: true, expired: false },
      'commerce-policy-1.4.0',
    );
    assert.equal(policy.decision, 'REVIEW');

    const req = raiseApproval({
      approvalId: 'ap-9',
      actionType: 'PRICE_CHANGE',
      riskClass: 4,
      requestedBy: 'op-1',
      proposalKey: 'k9',
      expiresAt: '2099-01-01T00:00:00Z',
    });
    const decision = authorise(req, approver, freshStepUp, NOW);
    assert.equal(decision.ok, true);
    assert.equal(decision.request.state, 'AUTHORISED');

    const proposal: ActionProposal = {
      actionType: 'PRICE_CHANGE',
      tenantId: 't-a',
      actorId: 'op-1',
      idempotencyKey: 'k9',
      targetType: 'offer',
      targetId: 'o9',
      riskClass: 4,
      policyVersion: 'commerce-policy-1.4.0',
      evidenceIds: [],
      payload: {},
      expiresAt: '2099-01-01T00:00:00Z',
      state: 'REVIEW',
    };
    assert.equal(canTransition(proposal.state, 'AUTHORISED'), true);
    assert.equal(transition(proposal, 'AUTHORISED').state, 'AUTHORISED');
  });
});
