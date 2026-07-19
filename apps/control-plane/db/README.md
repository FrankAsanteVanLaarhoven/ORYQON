# Control-plane database

## Tenant isolation (Gate 0)

`migrations/0001_tenant_rls.sql` enables **forced** PostgreSQL row-level security
on tenant tables and creates a hardened `oryqon_app` role with **no** `BYPASSRLS`.

The application enforces the same rule first (see `../src/security/tenant-store.ts`,
proven by `../test/tenant.test.ts`); the database enforces it again as defence in
depth.

### Verifying against a live PostgreSQL

No PostgreSQL is bundled with this checkout, so the DB layer is **not yet proven
in CI**. To verify the cross-tenant guarantee:

```bash
createdb oryqon_dev
psql oryqon_dev -f migrations/0001_tenant_rls.sql

# As oryqon_app, tenant A can see only tenant A's rows:
psql oryqon_dev <<'SQL'
SET ROLE oryqon_app;
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000a';
INSERT INTO products (tenant_id, name) VALUES ('00000000-0000-0000-0000-00000000000a', 'A');
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000b';
SELECT count(*) FROM products;          -- expect 0 (cannot see tenant A)
INSERT INTO products (tenant_id, name)  -- expect ERROR: row violates policy
  VALUES ('00000000-0000-0000-0000-00000000000a', 'cross');
SQL

# With no app.tenant_id set, reads return nothing and writes are rejected (fail closed).
```

This is the "cross-tenant test suite passes" and "missing tenant fails closed"
Gate 0 exit condition at the database layer. Wire it into CI against a Postgres
service before claiming Gate 0 fully closed.
