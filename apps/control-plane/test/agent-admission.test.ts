import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTenant } from '../src/security/tenant-context.ts';
import { AgentRegistry } from '../src/agents/agent-registry.ts';
import type { AgentSpec } from '../src/agents/agent-registry.ts';
import { AgentRun } from '../src/agents/agent-run.ts';
import { admitProposal } from '../src/agents/admission.ts';
import { evaluatePolicy } from '../src/policy/policy-engine.ts';
import type { ActionProposal } from '../src/idempotency/action-proposal.ts';

const spec: AgentSpec = {
  agentId: 'agent.copy',
  allowedActionTypes: ['PUBLISH_CONTENT', 'IMPORT_PRODUCT'],
  riskCeiling: 3,
  autonomy: 'PROPOSE',
  maxStepsPerRun: 3,
};

function proposal(over: Partial<ActionProposal> = {}): ActionProposal {
  return {
    actionType: 'PUBLISH_CONTENT',
    tenantId: 't-a',
    actorId: 'agent.copy',
    idempotencyKey: 'k1',
    targetType: 'content',
    targetId: 'c1',
    riskClass: 2,
    policyVersion: 'v1',
    evidenceIds: [],
    payload: {},
    expiresAt: '2099-01-01T00:00:00Z',
    state: 'PROPOSED',
    ...over,
  };
}

function fixture(specOver: Partial<AgentSpec> = {}) {
  const registry = new AgentRegistry();
  registry.register({ ...spec, ...specOver });
  const run = new AgentRun('run-1', 'agent.copy', spec.maxStepsPerRun);
  return { registry, run };
}

test('an in-capability, in-risk proposal from an active agent is admitted', () => {
  withTenant('t-a', () => {
    const { registry, run } = fixture();
    const r = admitProposal({ registry, run, proposal: proposal() });
    assert.equal(r.admitted, true);
    assert.equal(r.reason, 'ADMITTED');
  });
});

test('an action outside the capability set is rejected', () => {
  withTenant('t-a', () => {
    const { registry, run } = fixture();
    const r = admitProposal({ registry, run, proposal: proposal({ actionType: 'PRICE_CHANGE' }) });
    assert.equal(r.admitted, false);
    assert.equal(r.reason, 'ACTION_NOT_IN_CAPABILITY');
  });
});

test('a proposal above the risk ceiling is rejected', () => {
  withTenant('t-a', () => {
    const { registry, run } = fixture();
    const r = admitProposal({ registry, run, proposal: proposal({ riskClass: 5 }) });
    assert.equal(r.reason, 'RISK_CEILING_EXCEEDED');
  });
});

test('a suspended agent cannot propose', () => {
  withTenant('t-a', () => {
    const { registry, run } = fixture();
    registry.suspend('agent.copy');
    const r = admitProposal({ registry, run, proposal: proposal() });
    assert.equal(r.reason, 'AGENT_SUSPENDED');
  });
});

test('an unregistered agent is rejected', () => {
  withTenant('t-a', () => {
    const registry = new AgentRegistry();
    registry.register(spec);
    const run = new AgentRun('run-1', 'ghost', 3);
    const r = admitProposal({ registry, run, proposal: proposal({ actorId: 'ghost' }) });
    assert.equal(r.reason, 'AGENT_NOT_FOUND');
  });
});

test('an observe-only agent cannot propose', () => {
  withTenant('t-a', () => {
    const { registry, run } = fixture({ autonomy: 'OBSERVE' });
    const r = admitProposal({ registry, run, proposal: proposal() });
    assert.equal(r.reason, 'AUTONOMY_FORBIDS_PROPOSAL');
  });
});

test('a terminated run admits nothing', () => {
  withTenant('t-a', () => {
    const { registry, run } = fixture();
    run.complete();
    const r = admitProposal({ registry, run, proposal: proposal() });
    assert.equal(r.reason, 'RUN_NOT_ACTIVE');
  });
});

test('an exhausted step budget admits nothing', () => {
  withTenant('t-a', () => {
    const { registry, run } = fixture();
    run.step();
    run.step();
    run.step();
    assert.equal(run.remaining(), 0);
    const r = admitProposal({ registry, run, proposal: proposal() });
    assert.equal(r.reason, 'STEP_BUDGET_EXCEEDED');
  });
});

test('an engaged kill switch admits nothing', () => {
  withTenant('t-a', () => {
    const { registry, run } = fixture();
    const r = admitProposal({ registry, run, proposal: proposal(), killSwitch: true });
    assert.equal(r.reason, 'KILL_SWITCH_ENGAGED');
  });
});

test('a proposal for a different tenant is rejected', () => {
  withTenant('t-a', () => {
    const { registry, run } = fixture();
    const r = admitProposal({ registry, run, proposal: proposal({ tenantId: 't-b' }) });
    assert.equal(r.reason, 'TENANT_MISMATCH');
  });
});

test('full flow: admit -> record step -> policy evaluate', () => {
  withTenant('t-a', () => {
    const { registry, run } = fixture();
    const p = proposal({ actionType: 'IMPORT_PRODUCT', riskClass: 1 });

    const admission = admitProposal({ registry, run, proposal: p });
    assert.equal(admission.admitted, true);

    const stepNo = run.step();
    assert.equal(stepNo, 1);

    const decision = evaluatePolicy(
      { actionType: p.actionType, riskClass: p.riskClass, hasEvidence: false, expired: false },
      p.policyVersion,
    );
    assert.equal(decision.decision, 'ALLOW');
    assert.equal(decision.reason, 'LOW_RISK_ALLOWED');
  });
});
