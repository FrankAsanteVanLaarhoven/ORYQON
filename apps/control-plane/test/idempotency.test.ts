import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  transition,
  canTransition,
  isExpired,
  IllegalTransitionError,
  type ActionProposal,
} from '../src/idempotency/action-proposal.ts';
import { InMemoryIdempotencyStore } from '../src/idempotency/idempotency-store.ts';

function proposal(overrides: Partial<ActionProposal> = {}): ActionProposal {
  return {
    actionType: 'PUBLISH_CONTENT',
    tenantId: 'tenant-a',
    actorId: 'actor-1',
    idempotencyKey: 'cmd-123',
    targetType: 'CAMPAIGN_VARIANT',
    targetId: 'variant-9',
    riskClass: 4,
    policyVersion: 'commerce-policy-1.0.0',
    evidenceIds: ['ev-1'],
    payload: {},
    expiresAt: '2999-01-01T00:00:00Z',
    state: 'PROPOSED',
    ...overrides,
  };
}

test('replaying an idempotency key yields no duplicate action', async () => {
  const store = new InMemoryIdempotencyStore();
  const first = await store.create(proposal());
  const replay = await store.create(proposal({ payload: { changed: true } }));

  assert.equal(first.created, true);
  assert.equal(replay.created, false);
  assert.equal(replay.proposal, first.proposal, 'replay returns the original');
  assert.equal(store.size(), 1);
});

test('the same key under different tenants is distinct', async () => {
  const store = new InMemoryIdempotencyStore();
  await store.create(proposal({ tenantId: 'tenant-a' }));
  const other = await store.create(proposal({ tenantId: 'tenant-b' }));
  assert.equal(other.created, true);
  assert.equal(store.size(), 2);
});

test('the lifecycle advances only along legal transitions', () => {
  let p = proposal();
  p = transition(p, 'AUTHORISED');
  p = transition(p, 'EXECUTING');
  p = transition(p, 'EXECUTED');
  assert.equal(p.state, 'EXECUTED');
});

test('illegal transitions throw', () => {
  const executed = proposal({ state: 'EXECUTED' });
  assert.throws(() => transition(executed, 'PROPOSED'), IllegalTransitionError);
  assert.equal(canTransition('PROPOSED', 'EXECUTED'), false);
  assert.equal(canTransition('EXECUTED', 'REVOKED'), false);
});

test('expiry is detected', () => {
  const now = Date.parse('2026-07-19T00:00:00Z');
  assert.equal(isExpired(proposal({ expiresAt: '2020-01-01T00:00:00Z' }), now), true);
  assert.equal(isExpired(proposal({ expiresAt: '2999-01-01T00:00:00Z' }), now), false);
  assert.equal(isExpired(proposal({ expiresAt: 'not-a-date' }), now), true);
});
