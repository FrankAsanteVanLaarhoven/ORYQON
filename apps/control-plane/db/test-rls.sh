#!/usr/bin/env bash
#
# Gate 0 database check: apply the tenant-RLS migration and run the cross-tenant
# test against the PostgreSQL at $DATABASE_URL. Any failed assertion RAISEs and,
# with ON_ERROR_STOP, makes psql (and this script) exit non-zero.
#
# CI passes DATABASE_URL for a service container. Locally, either export a
# DATABASE_URL to a throwaway database, or run the two .sql files with
# `docker exec <pg> psql ...` (see db/README.md).
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
: "${DATABASE_URL:?set DATABASE_URL to a PostgreSQL connection string}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$DIR/migrations/0001_tenant_rls.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$DIR/tests/rls_cross_tenant.sql"

echo "Gate 0 database RLS: PASSED"
