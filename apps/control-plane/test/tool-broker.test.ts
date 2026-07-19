import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ToolBroker,
  BrokerError,
  type AgentTask,
  type AuditEvent,
} from '../src/broker/tool-broker.ts';

const SECRET = 'oauth-refresh-token-should-never-leak';

function setup() {
  const broker = new ToolBroker();
  const seen: { args?: Record<string, unknown> } = {};
  // The credential is captured in the handler closure — never handed to the agent.
  broker.register({
    id: 'shopify.publish',
    permittedAgents: new Set(['channel-compiler']),
    requiresApproval: true,
    handler: async (_task, args) => {
      seen.args = args;
      return { published: true, credentialLength: SECRET.length };
    },
  });
  return { broker, seen };
}

const task = (over: Partial<AgentTask> = {}): AgentTask => ({
  tenantId: 'tenant-a',
  agent: 'channel-compiler',
  allowedToolIds: new Set(['shopify.publish']),
  approvals: new Set(['shopify.publish']),
  ...over,
});

test('admits a call only with allow + permit + approval', async () => {
  const { broker } = setup();
  const events: AuditEvent[] = [];
  const result = await broker.invoke(task(), { toolId: 'shopify.publish', args: { x: 1 } }, (e) =>
    events.push(e),
  );
  assert.deepEqual(result, { published: true, credentialLength: SECRET.length });
  assert.deepEqual(events, [
    { tenantId: 'tenant-a', agent: 'channel-compiler', toolId: 'shopify.publish', reason: 'OK' },
  ]);
});

test('the agent never receives the underlying credential', async () => {
  const { broker, seen } = setup();
  const result = await broker.invoke(task(), {
    toolId: 'shopify.publish',
    args: { note: 'go' },
  });
  assert.equal(JSON.stringify(result).includes(SECRET), false);
  assert.equal(JSON.stringify(seen.args).includes(SECRET), false);
});

test('a tool not on the task allowlist is refused', async () => {
  const { broker } = setup();
  await assert.rejects(
    broker.invoke(task({ allowedToolIds: new Set() }), { toolId: 'shopify.publish' }),
    (e) => e instanceof BrokerError && e.reason === 'TOOL_NOT_ALLOWED_FOR_TASK',
  );
});

test('an unregistered tool is refused', async () => {
  const { broker } = setup();
  await assert.rejects(
    broker.invoke(task({ allowedToolIds: new Set(['ghost.tool']) }), { toolId: 'ghost.tool' }),
    (e) => e instanceof BrokerError && e.reason === 'TOOL_NOT_REGISTERED',
  );
});

test('an agent not permitted for the tool is refused', async () => {
  const { broker } = setup();
  await assert.rejects(
    broker.invoke(task({ agent: 'copy' }), { toolId: 'shopify.publish' }),
    (e) => e instanceof BrokerError && e.reason === 'TOOL_NOT_ALLOWED_FOR_AGENT',
  );
});

test('a call needing approval without one is refused', async () => {
  const { broker } = setup();
  await assert.rejects(
    broker.invoke(task({ approvals: new Set() }), { toolId: 'shopify.publish' }),
    (e) => e instanceof BrokerError && e.reason === 'APPROVAL_REQUIRED',
  );
});

test('an engaged kill switch refuses everything', async () => {
  const { broker } = setup();
  await assert.rejects(
    broker.invoke(task({ killSwitch: true }), { toolId: 'shopify.publish' }),
    (e) => e instanceof BrokerError && e.reason === 'KILL_SWITCH_ENGAGED',
  );
});
