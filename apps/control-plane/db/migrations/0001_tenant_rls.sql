-- ORYQON — Gate 0 tenant isolation (PostgreSQL row-level security).
--
-- Defence in depth: the application already scopes every access to the ambient
-- tenant (see src/security/tenant-store.ts, proven by tests). This migration
-- enforces the same rule a second time at the storage engine, so a bug or a
-- direct query cannot cross tenants. The application role holds NO BYPASSRLS.
--
-- Contract: every transaction must `SET LOCAL app.tenant_id = '<uuid>'` before
-- touching a tenant table. With no setting, current_tenant_id() returns NULL and
-- every policy predicate is false — reads return nothing and writes are rejected
-- (fail closed).

BEGIN;

CREATE SCHEMA IF NOT EXISTS app;

-- Reads the per-transaction tenant. `missing_ok => true` so an unset GUC yields
-- NULL rather than raising — the policies then deny, which is the fail-closed
-- behaviour we want.
CREATE OR REPLACE FUNCTION app.current_tenant_id() RETURNS uuid
  LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

-- Example tenant tables ------------------------------------------------------

CREATE TABLE IF NOT EXISTS products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  name         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS action_proposals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  idempotency_key text NOT NULL,
  action_type     text NOT NULL,
  actor_id        uuid NOT NULL,
  target_type     text NOT NULL,
  target_id       text NOT NULL,
  risk_class      smallint NOT NULL,
  policy_version  text NOT NULL,
  state           text NOT NULL DEFAULT 'PROPOSED',
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- Durable idempotency: a replayed command cannot create a second action.
  CONSTRAINT action_proposals_idem UNIQUE (tenant_id, idempotency_key)
);

-- Row-level security ---------------------------------------------------------

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_products ON products
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE action_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_proposals FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_action_proposals ON action_proposals
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

-- Hardened application role --------------------------------------------------
-- Owns no tenant tables and cannot bypass RLS. Database administration uses a
-- separate role.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'oryqon_app') THEN
    CREATE ROLE oryqon_app
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA app, public TO oryqon_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON products, action_proposals TO oryqon_app;
GRANT EXECUTE ON FUNCTION app.current_tenant_id() TO oryqon_app;

COMMIT;
