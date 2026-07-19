import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTenant } from '../src/security/tenant-context.ts';
import { Campaign } from '../src/campaigns/campaign.ts';

test('a new campaign is DRAFT and empty', () => {
  withTenant('t-a', () => {
    const c = new Campaign('camp-1', 'Autumn Field launch');
    assert.equal(c.state(), 'DRAFT');
    assert.equal(c.size(), 0);
    assert.equal(c.tenantId, 't-a');
  });
});

test('proposals can be added while non-terminal', () => {
  withTenant('t-a', () => {
    const c = new Campaign('camp-1', 'x');
    c.addProposal('k1');
    c.addProposal('k2');
    c.addProposal('k1'); // dedup
    assert.equal(c.size(), 2);
    assert.deepEqual(c.members().sort(), ['k1', 'k2']);
  });
});

test('a campaign cannot be activated empty', () => {
  withTenant('t-a', () => {
    const c = new Campaign('camp-1', 'x');
    assert.throws(() => c.activate(), /EMPTY_CAMPAIGN/);
    assert.equal(c.state(), 'DRAFT');
  });
});

test('the happy-path lifecycle: draft -> active -> paused -> active -> completed', () => {
  withTenant('t-a', () => {
    const c = new Campaign('camp-1', 'x');
    c.addProposal('k1');
    c.activate();
    assert.equal(c.state(), 'ACTIVE');
    c.pause();
    assert.equal(c.state(), 'PAUSED');
    c.resume();
    assert.equal(c.state(), 'ACTIVE');
    c.complete();
    assert.equal(c.state(), 'COMPLETED');
  });
});

test('illegal transitions are rejected', () => {
  withTenant('t-a', () => {
    const c = new Campaign('camp-1', 'x');
    c.addProposal('k1');
    assert.throws(() => c.pause(), /NOT_ACTIVE/); // still DRAFT
    c.activate();
    assert.throws(() => c.activate(), /NOT_DRAFT/);
    assert.throws(() => c.resume(), /NOT_PAUSED/);
  });
});

test('a terminal campaign takes no more proposals and cannot be cancelled again', () => {
  withTenant('t-a', () => {
    const c = new Campaign('camp-1', 'x');
    c.addProposal('k1');
    c.cancel();
    assert.equal(c.state(), 'CANCELLED');
    assert.throws(() => c.addProposal('k2'), /CAMPAIGN_TERMINAL/);
    assert.throws(() => c.cancel(), /CAMPAIGN_TERMINAL/);
  });
});

test('constructing without a tenant, or using across tenants, fails closed', () => {
  assert.throws(() => new Campaign('camp-1', 'x'), /TENANT_CONTEXT_MISSING/);
  const c = withTenant('t-a', () => {
    const camp = new Campaign('camp-1', 'x');
    camp.addProposal('k1');
    return camp;
  });
  withTenant('t-b', () => {
    assert.throws(() => c.activate(), /CROSS_TENANT_DENIED/);
    assert.throws(() => c.state(), /CROSS_TENANT_DENIED/);
  });
});
