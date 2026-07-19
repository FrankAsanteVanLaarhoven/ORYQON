import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTenant } from '../src/security/tenant-context.ts';
import { evaluateReadiness, EnterpriseConfigStore } from '../src/enterprise/readiness.ts';
import type { EnterpriseConfig } from '../src/enterprise/readiness.ts';

const good: EnterpriseConfig = {
  residencyRegion: 'EU-WEST',
  allowedResidencyRegions: ['EU-WEST', 'EU-CENTRAL'],
  ssoEnforced: true,
  customerManagedKeys: true,
  auditExportEnabled: true,
  rbacSeparationEnforced: true,
  minAAL: 2,
};

function gapIds(config: EnterpriseConfig): string[] {
  return evaluateReadiness(config).gaps.map((g) => g.id);
}

test('a fully compliant configuration is ready with no gaps', () => {
  const r = evaluateReadiness(good);
  assert.equal(r.ready, true);
  assert.deepEqual(r.gaps, []);
  assert.equal(r.checked.length, 6);
});

test('each unmet requirement surfaces as a specific gap', () => {
  assert.deepEqual(gapIds({ ...good, ssoEnforced: false }), ['sso']);
  assert.deepEqual(gapIds({ ...good, customerManagedKeys: false }), ['cmk']);
  assert.deepEqual(gapIds({ ...good, auditExportEnabled: false }), ['audit_export']);
  assert.deepEqual(gapIds({ ...good, rbacSeparationEnforced: false }), ['rbac_separation']);
  assert.deepEqual(gapIds({ ...good, residencyRegion: 'US-EAST' }), ['residency']);
  assert.deepEqual(gapIds({ ...good, minAAL: 1 }), ['aal']);
});

test('multiple gaps are all reported and the deployment is not ready', () => {
  const r = evaluateReadiness({ ...good, ssoEnforced: false, customerManagedKeys: false });
  assert.equal(r.ready, false);
  assert.deepEqual(r.gaps.map((g) => g.id).sort(), ['cmk', 'sso']);
});

test('the store evaluates the current tenant config; no config fails closed', () => {
  const store = new EnterpriseConfigStore();
  withTenant('t-a', () => {
    assert.equal(store.readiness().ready, false); // nothing set yet
    assert.equal(store.readiness().gaps[0].id, 'config');
    store.set(good);
    assert.equal(store.readiness().ready, true);
  });
  withTenant('t-b', () => {
    // t-a's config is invisible here — still fails closed
    assert.equal(store.readiness().ready, false);
    assert.equal(store.readiness().gaps[0].id, 'config');
  });
});

test('setting config without a tenant scope fails closed', () => {
  const store = new EnterpriseConfigStore();
  assert.throws(() => store.set(good), /TENANT_CONTEXT_MISSING/);
});
