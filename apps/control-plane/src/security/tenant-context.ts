import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Ambient tenant context.
 *
 * Mirrors the database contract: just as a Postgres transaction must set
 * `app.tenant_id` before touching a tenant table, application code must run
 * inside a tenant scope. Reading the tenant when none is set FAILS CLOSED —
 * there is no implicit "all tenants" mode.
 */

export interface TenantScope {
  tenantId: string;
}

const storage = new AsyncLocalStorage<TenantScope>();

export function withTenant<T>(tenantId: string, fn: () => T): T {
  if (!tenantId) throw new Error('TENANT_CONTEXT_INVALID');
  return storage.run({ tenantId }, fn);
}

export function currentTenant(): string | null {
  return storage.getStore()?.tenantId ?? null;
}

export function requireTenant(): string {
  const tenantId = currentTenant();
  if (!tenantId) throw new Error('TENANT_CONTEXT_MISSING');
  return tenantId;
}
