-- ORYQON — Gates 2–7 domain RLS + constraint test (runs against a live PostgreSQL).
--
-- Assumes 0001_tenant_rls.sql and 0002_domain_schema.sql are applied. Runs as
-- the oryqon_app role under forced RLS (no BYPASSRLS). Any failed assertion
-- RAISEs and, with ON_ERROR_STOP, makes psql exit non-zero — so this file IS
-- the test.

\set ON_ERROR_STOP on

\echo '── resetting domain fixture tables'
TRUNCATE evidence, connectors, audit_entries, agents, approvals CASCADE;

\echo '── seeding tenant A evidence (as oryqon_app in A context)'
BEGIN;
  SET LOCAL ROLE oryqon_app;
  SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000a';
  INSERT INTO evidence (tenant_id, evidence_id, kind, source, statement, content_hash, captured_at)
    VALUES ('00000000-0000-0000-0000-00000000000a', 'ev_1', 'DOCUMENT', 'lab',
            'waterproof to 10,000mm', 'abcd1234', now());
COMMIT;

\echo '── test 1: tenant A sees exactly its own evidence'
BEGIN;
  SET LOCAL ROLE oryqon_app;
  SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000a';
  DO $$ BEGIN
    IF (SELECT count(*) FROM evidence) <> 1 THEN
      RAISE EXCEPTION 'FAIL: tenant A must see exactly 1 evidence row, saw %',
        (SELECT count(*) FROM evidence);
    END IF;
  END $$;
COMMIT;

\echo '── test 2: tenant B sees none of tenant A''s evidence (isolation)'
BEGIN;
  SET LOCAL ROLE oryqon_app;
  SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000b';
  DO $$ BEGIN
    IF (SELECT count(*) FROM evidence) <> 0 THEN
      RAISE EXCEPTION 'FAIL: tenant B must not see tenant A evidence';
    END IF;
  END $$;
COMMIT;

\echo '── test 3: tenant B cannot write evidence owned by tenant A (WITH CHECK)'
BEGIN;
  SET LOCAL ROLE oryqon_app;
  SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000b';
  DO $$ BEGIN
    BEGIN
      INSERT INTO evidence (tenant_id, evidence_id, kind, source, statement, content_hash, captured_at)
        VALUES ('00000000-0000-0000-0000-00000000000a', 'ev_x', 'DOCUMENT', 's', 'x', 'h', now());
      RAISE EXCEPTION 'FAIL: cross-tenant evidence insert was NOT rejected';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- expected
    END;
  END $$;
COMMIT;

\echo '── test 4: no tenant context fails closed'
BEGIN;
  SET LOCAL ROLE oryqon_app;
  DO $$ BEGIN
    IF (SELECT count(*) FROM evidence) <> 0 THEN
      RAISE EXCEPTION 'FAIL: read with no tenant context must be empty';
    END IF;
    BEGIN
      INSERT INTO evidence (tenant_id, evidence_id, kind, source, statement, content_hash, captured_at)
        VALUES ('00000000-0000-0000-0000-00000000000a', 'ev_nc', 'DOCUMENT', 's', 'x', 'h', now());
      RAISE EXCEPTION 'FAIL: insert with no tenant context must be rejected';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- expected: fail closed
    END;
  END $$;
COMMIT;

\echo '── test 5: a connector credential must be a reference, not an inline secret (CHECK)'
BEGIN;
  SET LOCAL ROLE oryqon_app;
  SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000a';
  DO $$ BEGIN
    BEGIN
      INSERT INTO connectors (tenant_id, connector_id, channel, capabilities, credential_ref)
        VALUES ('00000000-0000-0000-0000-00000000000a', 'c1', 'shopify',
                ARRAY['PUBLISH_CONTENT'], 'shpat_live_inline_secret');
      RAISE EXCEPTION 'FAIL: an inline-secret credential_ref was NOT rejected';
    EXCEPTION WHEN check_violation THEN
      NULL; -- expected: only ref:* is allowed
    END;
  END $$;
  -- a proper reference is accepted
  INSERT INTO connectors (tenant_id, connector_id, channel, capabilities, credential_ref)
    VALUES ('00000000-0000-0000-0000-00000000000a', 'c1', 'shopify',
            ARRAY['PUBLISH_CONTENT'], 'ref:shopify/prod');
COMMIT;

\echo '── test 6: another domain (agents) is tenant-isolated too'
BEGIN;
  SET LOCAL ROLE oryqon_app;
  SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000a';
  INSERT INTO agents (tenant_id, agent_id, allowed_action_types, risk_ceiling, autonomy, max_steps_per_run)
    VALUES ('00000000-0000-0000-0000-00000000000a', 'agent.copy',
            ARRAY['PUBLISH_CONTENT'], 3, 'PROPOSE', 5);
COMMIT;
BEGIN;
  SET LOCAL ROLE oryqon_app;
  SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000b';
  DO $$ BEGIN
    IF (SELECT count(*) FROM agents) <> 0 THEN
      RAISE EXCEPTION 'FAIL: tenant B must not see tenant A agents';
    END IF;
  END $$;
COMMIT;

\echo '── test 7: a replayed audit sequence is rejected by the unique constraint'
BEGIN;
  SET LOCAL ROLE oryqon_app;
  SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000a';
  INSERT INTO audit_entries (tenant_id, seq, action, prev_digest, digest, at)
    VALUES ('00000000-0000-0000-0000-00000000000a', 1, 'CONTENT_PUBLISHED', '0000', 'aaaa', now());
  DO $$ BEGIN
    BEGIN
      INSERT INTO audit_entries (tenant_id, seq, action, prev_digest, digest, at)
        VALUES ('00000000-0000-0000-0000-00000000000a', 1, 'DUP', 'aaaa', 'bbbb', now());
      RAISE EXCEPTION 'FAIL: a replayed audit seq was NOT rejected';
    EXCEPTION WHEN unique_violation THEN
      NULL; -- expected: (tenant_id, seq) is unique
    END;
  END $$;
COMMIT;

\echo 'DOMAIN RLS + CONSTRAINT TESTS PASSED'
