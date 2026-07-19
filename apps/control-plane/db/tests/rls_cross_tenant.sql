-- ORYQON — Gate 0 cross-tenant RLS test (runs against a live PostgreSQL).
--
-- Assumes 0001_tenant_rls.sql is already applied. Connects as a superuser and
-- SET LOCAL ROLE oryqon_app inside each transaction so that forced RLS (and the
-- role's lack of BYPASSRLS) actually applies. Any failed assertion RAISEs and,
-- with ON_ERROR_STOP, makes psql exit non-zero — so this file IS the test.

\set ON_ERROR_STOP on

\echo '── resetting fixture tables'
TRUNCATE products, action_proposals;

\echo '── seeding tenant A row (as oryqon_app in A context)'
BEGIN;
  SET LOCAL ROLE oryqon_app;
  SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000a';
  INSERT INTO products (tenant_id, name)
    VALUES ('00000000-0000-0000-0000-00000000000a', 'A-row');
COMMIT;

\echo '── test 1: tenant A sees exactly its own row'
BEGIN;
  SET LOCAL ROLE oryqon_app;
  SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000a';
  DO $$ BEGIN
    IF (SELECT count(*) FROM products) <> 1 THEN
      RAISE EXCEPTION 'FAIL: tenant A must see exactly 1 row, saw %',
        (SELECT count(*) FROM products);
    END IF;
  END $$;
COMMIT;

\echo '── test 2: tenant B sees none of tenant A''s rows (isolation)'
BEGIN;
  SET LOCAL ROLE oryqon_app;
  SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000b';
  DO $$ BEGIN
    IF (SELECT count(*) FROM products) <> 0 THEN
      RAISE EXCEPTION 'FAIL: tenant B must not see tenant A rows';
    END IF;
  END $$;
COMMIT;

\echo '── test 3: tenant B cannot write a row owned by tenant A (WITH CHECK)'
BEGIN;
  SET LOCAL ROLE oryqon_app;
  SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000b';
  DO $$ BEGIN
    BEGIN
      INSERT INTO products (tenant_id, name)
        VALUES ('00000000-0000-0000-0000-00000000000a', 'cross');
      RAISE EXCEPTION 'FAIL: cross-tenant insert was NOT rejected';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- expected: RLS WITH CHECK rejected it
    END;
  END $$;
COMMIT;

\echo '── test 4: no tenant context fails closed (empty reads, rejected writes)'
BEGIN;
  SET LOCAL ROLE oryqon_app;
  -- app.tenant_id deliberately unset
  DO $$ BEGIN
    IF (SELECT count(*) FROM products) <> 0 THEN
      RAISE EXCEPTION 'FAIL: read with no tenant context must be empty';
    END IF;
    BEGIN
      INSERT INTO products (tenant_id, name)
        VALUES ('00000000-0000-0000-0000-00000000000a', 'nocontext');
      RAISE EXCEPTION 'FAIL: insert with no tenant context must be rejected';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- expected: fail closed
    END;
  END $$;
COMMIT;

\echo '── test 5: idempotency unique constraint blocks a replayed key'
BEGIN;
  SET LOCAL ROLE oryqon_app;
  SET LOCAL app.tenant_id = '00000000-0000-0000-0000-00000000000a';
  INSERT INTO action_proposals
    (tenant_id, idempotency_key, action_type, actor_id, target_type, target_id,
     risk_class, policy_version, expires_at)
    VALUES ('00000000-0000-0000-0000-00000000000a', 'cmd-1', 'PUBLISH_CONTENT',
     '00000000-0000-0000-0000-0000000000f1', 'CAMPAIGN_VARIANT', 'v1', 4,
     'commerce-policy-1.0.0', now() + interval '1 hour');
  DO $$ BEGIN
    BEGIN
      INSERT INTO action_proposals
        (tenant_id, idempotency_key, action_type, actor_id, target_type, target_id,
         risk_class, policy_version, expires_at)
        VALUES ('00000000-0000-0000-0000-00000000000a', 'cmd-1', 'PUBLISH_CONTENT',
         '00000000-0000-0000-0000-0000000000f1', 'CAMPAIGN_VARIANT', 'v1', 4,
         'commerce-policy-1.0.0', now() + interval '1 hour');
      RAISE EXCEPTION 'FAIL: replayed idempotency key was NOT rejected';
    EXCEPTION WHEN unique_violation THEN
      NULL; -- expected: (tenant_id, idempotency_key) is unique
    END;
  END $$;
COMMIT;

\echo 'RLS CROSS-TENANT TESTS PASSED'
