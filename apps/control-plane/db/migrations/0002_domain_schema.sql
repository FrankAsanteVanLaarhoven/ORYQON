-- ORYQON — Gates 2–7 persistence schema (PostgreSQL row-level security).
--
-- Extends the Gate-0 tenant-isolation foundation (0001) to every domain the
-- control plane models: products & evidence (G2), agents (G3), campaigns &
-- approvals (G4), connectors (G5), analytics (G6) and enterprise config +
-- audit (G7). Every tenant table gets FORCED row-level security with the same
-- `tenant_id = app.current_tenant_id()` predicate, so a bug or a direct query
-- cannot cross tenants; with no `app.tenant_id` set, reads are empty and writes
-- are rejected (fail closed). The application enforces the same rules first
-- (see src/); this is defence in depth.
--
-- Requires 0001_tenant_rls.sql (the app schema, current_tenant_id() and the
-- hardened oryqon_app role) to be applied first.

BEGIN;

-- Parent-child references use composite keys including tenant_id, so a child can
-- only ever reference a parent within the same tenant.

-- G2 — products & evidence ---------------------------------------------------

CREATE TABLE IF NOT EXISTS evidence (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  evidence_id  text NOT NULL,           -- content-addressed id from the app
  kind         text NOT NULL,
  source       text NOT NULL,
  statement    text NOT NULL,
  content_hash text NOT NULL,
  captured_at  timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_uq UNIQUE (tenant_id, evidence_id),
  CONSTRAINT evidence_tid_id UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS product_passports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  product_id        text NOT NULL,
  status            text NOT NULL DEFAULT 'DRAFT',
  published_version text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_passports_uq UNIQUE (tenant_id, product_id),
  CONSTRAINT product_passports_tid_id UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS passport_claims (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  passport_id  uuid NOT NULL,
  claim_id     text NOT NULL,
  attribute    text NOT NULL,
  value        text NOT NULL,
  required     boolean NOT NULL DEFAULT true,
  status       text NOT NULL DEFAULT 'UNVERIFIED',
  CONSTRAINT passport_claims_uq UNIQUE (tenant_id, passport_id, attribute),
  CONSTRAINT passport_claims_tid_id UNIQUE (tenant_id, id),
  CONSTRAINT passport_claims_passport_fk
    FOREIGN KEY (tenant_id, passport_id) REFERENCES product_passports (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS claim_evidence (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  claim_id    uuid NOT NULL,
  evidence_id uuid NOT NULL,
  CONSTRAINT claim_evidence_uq UNIQUE (tenant_id, claim_id, evidence_id),
  CONSTRAINT claim_evidence_claim_fk
    FOREIGN KEY (tenant_id, claim_id) REFERENCES passport_claims (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT claim_evidence_evidence_fk
    FOREIGN KEY (tenant_id, evidence_id) REFERENCES evidence (tenant_id, id) ON DELETE CASCADE
);

-- G3 — agent control plane ---------------------------------------------------

CREATE TABLE IF NOT EXISTS agents (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL,
  agent_id             text NOT NULL,
  allowed_action_types text[] NOT NULL DEFAULT '{}',
  risk_ceiling         smallint NOT NULL,
  autonomy             text NOT NULL,
  max_steps_per_run    integer NOT NULL,
  status               text NOT NULL DEFAULT 'ACTIVE',
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agents_uq UNIQUE (tenant_id, agent_id),
  CONSTRAINT agents_risk_ceiling_ck CHECK (risk_ceiling BETWEEN 0 AND 6)
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL,
  run_id     text NOT NULL,
  agent_id   text NOT NULL,
  max_steps  integer NOT NULL,
  steps_used integer NOT NULL DEFAULT 0,
  state      text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_runs_uq UNIQUE (tenant_id, run_id)
);

-- G4 — campaigns & approvals -------------------------------------------------

CREATE TABLE IF NOT EXISTS campaigns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  campaign_id text NOT NULL,
  objective   text NOT NULL,
  state       text NOT NULL DEFAULT 'DRAFT',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_uq UNIQUE (tenant_id, campaign_id),
  CONSTRAINT campaigns_tid_id UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS campaign_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  campaign_id  uuid NOT NULL,
  proposal_key text NOT NULL,
  CONSTRAINT campaign_members_uq UNIQUE (tenant_id, campaign_id, proposal_key),
  CONSTRAINT campaign_members_campaign_fk
    FOREIGN KEY (tenant_id, campaign_id) REFERENCES campaigns (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS approvals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  approval_id  text NOT NULL,
  action_type  text NOT NULL,
  risk_class   smallint NOT NULL,
  requested_by text NOT NULL,
  proposal_key text NOT NULL,
  state        text NOT NULL DEFAULT 'PENDING',
  decided_by   text,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT approvals_uq UNIQUE (tenant_id, approval_id)
);

-- G5 — official connectors ---------------------------------------------------

CREATE TABLE IF NOT EXISTS connectors (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  connector_id   text NOT NULL,
  channel        text NOT NULL,
  capabilities   text[] NOT NULL DEFAULT '{}',
  credential_ref text NOT NULL,  -- a REFERENCE only, never a secret
  status         text NOT NULL DEFAULT 'DISCONNECTED',
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connectors_uq UNIQUE (tenant_id, connector_id),
  -- Enforce "reference, not secret" at the storage engine.
  CONSTRAINT connectors_credref_is_reference CHECK (credential_ref LIKE 'ref:%')
);

-- G6 — analytics -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS analytics_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL,
  metric     text NOT NULL,
  dimension  text NOT NULL,
  value      double precision NOT NULL DEFAULT 1,
  at         timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- G7 — enterprise release readiness ------------------------------------------

CREATE TABLE IF NOT EXISTS enterprise_configs (
  tenant_id                 uuid PRIMARY KEY,
  residency_region          text NOT NULL,
  allowed_residency_regions text[] NOT NULL DEFAULT '{}',
  sso_enforced              boolean NOT NULL DEFAULT false,
  customer_managed_keys     boolean NOT NULL DEFAULT false,
  audit_export_enabled      boolean NOT NULL DEFAULT false,
  rbac_separation_enforced  boolean NOT NULL DEFAULT false,
  min_aal                   smallint NOT NULL DEFAULT 1,
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  seq         bigint NOT NULL,
  action      text NOT NULL,
  prev_digest text NOT NULL,
  digest      text NOT NULL,
  at          timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_entries_seq_uq UNIQUE (tenant_id, seq)
);

-- Uniform forced RLS + tenant-isolation policy + grants ----------------------
-- Same predicate on every table; applied in one place so no table can be missed.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'evidence', 'product_passports', 'passport_claims', 'claim_evidence',
    'agents', 'agent_runs', 'campaigns', 'campaign_members', 'approvals',
    'connectors', 'analytics_events', 'enterprise_configs', 'audit_entries'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%1$s ON %1$I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_%1$s ON %1$I '
      'USING (tenant_id = app.current_tenant_id()) '
      'WITH CHECK (tenant_id = app.current_tenant_id())', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO oryqon_app', t);
  END LOOP;
END
$$;

COMMIT;
