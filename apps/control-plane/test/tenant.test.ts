import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  withTenant,
  requireTenant,
  currentTenant,
} from '../src/security/tenant-context.ts';
import { TenantScopedStore } from '../src/security/tenant-store.ts';

interface Product {
  id: string;
  name: string;
}

test('requireTenant fails closed with no context', () => {
  assert.equal(currentTenant(), null);
  assert.throws(() => requireTenant(), /TENANT_CONTEXT_MISSING/);
});

test('withTenant rejects an empty tenant id', () => {
  assert.throws(() => withTenant('', () => 1), /TENANT_CONTEXT_INVALID/);
});

test('cross-tenant reads are isolated', () => {
  const store = new TenantScopedStore<Product>();
  withTenant('tenant-a', () => store.insert({ id: 'p1', name: 'Shell' }));

  const seenByB = withTenant('tenant-b', () => store.get('p1'));
  assert.equal(seenByB, null, 'tenant B must not see tenant A rows');

  const seenByA = withTenant('tenant-a', () => store.get('p1'));
  assert.equal(seenByA?.name, 'Shell');
  assert.equal(seenByA?.tenantId, 'tenant-a');
});

test('list is scoped to the ambient tenant', () => {
  const store = new TenantScopedStore<Product>();
  withTenant('tenant-a', () => {
    store.insert({ id: 'p1', name: 'A1' });
    store.insert({ id: 'p2', name: 'A2' });
  });
  withTenant('tenant-b', () => store.insert({ id: 'p3', name: 'B1' }));

  assert.equal(withTenant('tenant-a', () => store.list()).length, 2);
  assert.equal(withTenant('tenant-b', () => store.list()).length, 1);
});

test('writes without a tenant context fail closed', () => {
  const store = new TenantScopedStore<Product>();
  assert.throws(() => store.insert({ id: 'p1', name: 'x' }), /TENANT_CONTEXT_MISSING/);
});
