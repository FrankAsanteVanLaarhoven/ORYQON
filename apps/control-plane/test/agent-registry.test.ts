import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTenant } from '../src/security/tenant-context.ts';
import { AgentRegistry, AgentRegistryError } from '../src/agents/agent-registry.ts';
import type { AgentSpec } from '../src/agents/agent-registry.ts';

const spec: AgentSpec = {
  agentId: 'agent.copy',
  allowedActionTypes: ['PUBLISH_CONTENT', 'IMPORT_PRODUCT'],
  riskCeiling: 3,
  autonomy: 'PROPOSE',
  maxStepsPerRun: 5,
};

test('register returns an ACTIVE record with the capability envelope', () => {
  withTenant('t-a', () => {
    const reg = new AgentRegistry();
    const rec = reg.register(spec);
    assert.equal(rec.tenantId, 't-a');
    assert.equal(rec.status, 'ACTIVE');
    assert.equal(rec.riskCeiling, 3);
    assert.equal(rec.allowedActionTypes.has('PUBLISH_CONTENT'), true);
    assert.equal(reg.isActive('agent.copy'), true);
  });
});

test('an agent id cannot be registered twice in a tenant', () => {
  withTenant('t-a', () => {
    const reg = new AgentRegistry();
    reg.register(spec);
    assert.throws(() => reg.register(spec), /AGENT_EXISTS/);
  });
});

test('invalid autonomy, risk ceiling, or step budget is rejected', () => {
  withTenant('t-a', () => {
    const reg = new AgentRegistry();
    assert.throws(() => reg.register({ ...spec, autonomy: 'GOD' as unknown as AgentSpec['autonomy'] }), AgentRegistryError);
    assert.throws(() => reg.register({ ...spec, riskCeiling: 9 }), AgentRegistryError);
    assert.throws(() => reg.register({ ...spec, maxStepsPerRun: 0 }), AgentRegistryError);
  });
});

test('the registry is tenant-scoped — an agent is invisible across tenants', () => {
  const reg = new AgentRegistry();
  withTenant('t-a', () => reg.register(spec));
  withTenant('t-b', () => {
    assert.equal(reg.get('agent.copy'), null);
    assert.equal(reg.isActive('agent.copy'), false);
  });
  withTenant('t-a', () => assert.ok(reg.get('agent.copy')));
});

test('suspend and reinstate flip status without touching capabilities', () => {
  withTenant('t-a', () => {
    const reg = new AgentRegistry();
    reg.register(spec);
    reg.suspend('agent.copy');
    assert.equal(reg.isActive('agent.copy'), false);
    reg.reinstate('agent.copy');
    assert.equal(reg.isActive('agent.copy'), true);
    assert.equal(reg.get('agent.copy')?.allowedActionTypes.has('PUBLISH_CONTENT'), true);
  });
});

test('the returned capability set is a snapshot — mutating it does not leak', () => {
  withTenant('t-a', () => {
    const reg = new AgentRegistry();
    const rec = reg.register(spec);
    (rec.allowedActionTypes as Set<string>).add('DELETE_EVERYTHING');
    assert.equal(reg.get('agent.copy')?.allowedActionTypes.has('DELETE_EVERYTHING'), false);
  });
});

test('registering without a tenant scope fails closed', () => {
  const reg = new AgentRegistry();
  assert.throws(() => reg.register(spec), /TENANT_CONTEXT_MISSING/);
});
