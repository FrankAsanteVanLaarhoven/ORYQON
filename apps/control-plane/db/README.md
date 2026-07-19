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

## Domain schema (Gates 2–7)

`migrations/0002_domain_schema.sql` adds the persistence schema for every domain
the control plane models — evidence & product passports (G2), agents & runs (G3),
campaigns, members & approvals (G4), connectors (G5), analytics events (G6), and
enterprise config & audit entries (G7). Each table carries the same **forced**
RLS tenant-isolation policy from 0001, so the guarantee is uniform across all
15 tenant tables. Two storage-level invariants are also enforced: a connector
`credential_ref` must be a reference (`ref:%`, never an inline secret), and
`(tenant_id, seq)` on the audit chain is unique.

`tests/rls_domain.sql` proves, as `oryqon_app` under forced RLS: tenant-A-only
evidence visibility, tenant-B blindness, cross-tenant write rejection, no-context
fail-closed, the credential-reference `CHECK`, cross-tenant isolation of another
domain (agents), and the audit-sequence unique constraint.

The application keeps its deterministic in-memory stores for the unit suite; this
schema is the persistence contract and the second (storage-engine) line of tenant
defence. Wiring the stores to repositories over this schema is a later step.

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
# poll a real query (the init phase runs a temporary server that then restarts)
docker exec oryqon-pg bash -c 'for i in $(seq 1 90); do psql -U postgres -d oryqon -tAc "select 1" >/dev/null 2>&1 && break; sleep 1; done'
for f in migrations/0001_tenant_rls.sql migrations/0002_domain_schema.sql \
         tests/rls_cross_tenant.sql tests/rls_domain.sql; do
  docker exec -i oryqon-pg psql -U postgres -d oryqon -v ON_ERROR_STOP=1 < "apps/control-plane/db/$f"
done
docker rm -f oryqon-pg
```

**Status:** verified against PostgreSQL 16 (local Docker) — 15 tenant tables under
forced RLS; both `tests/rls_cross_tenant.sql` and `tests/rls_domain.sql` pass. Gate 0
is wired into CI; extend the CI step to run `db/test-rls.sh` for the full set.
