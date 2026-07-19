import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTenant } from '../src/security/tenant-context.ts';
import { AgentRun, AgentRunError } from '../src/agents/agent-run.ts';

test('a new run is ACTIVE with the full step budget', () => {
  withTenant('t-a', () => {
    const run = new AgentRun('run-1', 'agent.copy', 3);
    assert.equal(run.state(), 'ACTIVE');
    assert.equal(run.remaining(), 3);
    assert.equal(run.stepsUsed(), 0);
    assert.equal(run.tenantId, 't-a');
  });
});

test('steps consume the budget and cannot exceed it', () => {
  withTenant('t-a', () => {
    const run = new AgentRun('run-1', 'agent.copy', 2);
    assert.equal(run.step(), 1);
    assert.equal(run.step(), 2);
    assert.equal(run.remaining(), 0);
    assert.throws(() => run.step(), /STEP_BUDGET_EXCEEDED/);
  });
});

test('a completed run accepts no further steps', () => {
  withTenant('t-a', () => {
    const run = new AgentRun('run-1', 'agent.copy', 5);
    run.step();
    run.complete();
    assert.equal(run.state(), 'COMPLETED');
    assert.throws(() => run.step(), /RUN_NOT_ACTIVE/);
    assert.throws(() => run.abort(), /RUN_NOT_ACTIVE/);
  });
});

test('an invalid budget is rejected', () => {
  withTenant('t-a', () => {
    assert.throws(() => new AgentRun('run-1', 'agent.copy', 0), AgentRunError);
    assert.throws(() => new AgentRun('', 'agent.copy', 3), AgentRunError);
  });
});

test('a run used from another tenant fails closed', () => {
  const run = withTenant('t-a', () => new AgentRun('run-1', 'agent.copy', 3));
  withTenant('t-b', () => {
    assert.throws(() => run.step(), /CROSS_TENANT_DENIED/);
    assert.throws(() => run.state(), /CROSS_TENANT_DENIED/);
  });
});
