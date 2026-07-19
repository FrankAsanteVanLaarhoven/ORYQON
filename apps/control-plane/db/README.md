# Control-plane database

## Tenant isolation (Gate 0)

`migrations/0001_tenant_rls.sql` enables **forced** PostgreSQL row-level security
on tenant tables and creates a hardened `oryqon_app` role with **no** `BYPASSRLS`.

The application enforces the same rule first (`../src/security/tenant-store.ts`,
proven by `../test/tenant.test.ts`); the database enforces it again as defence in
depth — proven by `tests/rls_cross_tenant.sql`.

## Running the cross-tenant test

`tests/rls_cross_tenant.sql` asserts, as the `oryqon_app` role under forced RLS:

1. tenant A sees exactly its own row;
2. tenant B sees none of tenant A's rows (isolation);
3. tenant B cannot write a row owned by tenant A (`WITH CHECK`);
4. with no tenant context, reads are empty and writes are rejected (fail closed);
5. a replayed `(tenant_id, idempotency_key)` is rejected by the unique constraint.

Any failed assertion `RAISE`s and, under `ON_ERROR_STOP`, exits non-zero.

### In CI

`.github/workflows/ci.yml` runs a `postgres:16-alpine` service and executes
`db/test-rls.sh` against it. This is the automated proof of the Gate 0
"cross-tenant test suite passes" and "missing tenant fails closed" exit
conditions.

### Locally against a connection string

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/oryqon
bash apps/control-plane/db/test-rls.sh
```

### Locally with Docker (no host psql required)

```bash
docker run -d --name oryqon-pg -e POSTGRES_PASSWORD=oryqon -e POSTGRES_DB=oryqon postgres:16-alpine
docker exec oryqon-pg bash -c 'until pg_isready -U postgres -q; do sleep 0.5; done'
docker exec -i oryqon-pg psql -U postgres -d oryqon -v ON_ERROR_STOP=1 < apps/control-plane/db/migrations/0001_tenant_rls.sql
docker exec -i oryqon-pg psql -U postgres -d oryqon -v ON_ERROR_STOP=1 < apps/control-plane/db/tests/rls_cross_tenant.sql
docker rm -f oryqon-pg
```

**Status:** verified against PostgreSQL 16 (local Docker) and wired into CI.
