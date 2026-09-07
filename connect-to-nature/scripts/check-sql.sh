#!/usr/bin/env bash
# Applies every migration and the seed to a throwaway PostgreSQL database, then
# runs a few assertions against the result. This is what stops a broken
# migration reaching a Supabase project — it needs nothing but psql.
#
#   ./scripts/check-sql.sh
#
# Set PGDATABASE_CHECK to reuse a name other than ctn_check.
set -euo pipefail

# The migrations are written to re-run, so a fresh database reports a drop-if-
# exists for every policy. Those notices are noise here.
export PGOPTIONS="-c client_min_messages=warning"

DB="${PGDATABASE_CHECK:-ctn_check}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

psql -v ON_ERROR_STOP=1 -q -c "drop database if exists ${DB};" postgres
psql -v ON_ERROR_STOP=1 -q -c "create database ${DB};" postgres

psql -v ON_ERROR_STOP=1 -q -d "${DB}" -f "${HERE}/supabase/tests/auth-shim.sql"

for migration in "${HERE}"/supabase/migrations/*.sql; do
  echo "→ $(basename "${migration}")"
  psql -v ON_ERROR_STOP=1 -q -d "${DB}" -f "${migration}"
done

echo "→ seed.sql"
psql -v ON_ERROR_STOP=1 -q -d "${DB}" -f "${HERE}/supabase/seed.sql"

echo "→ assertions"
PGOPTIONS="" psql -v ON_ERROR_STOP=1 -q -d "${DB}" -f "${HERE}/supabase/tests/assertions.sql"

echo "→ row-level security"
PGOPTIONS="" psql -v ON_ERROR_STOP=1 -q -d "${DB}" -f "${HERE}/supabase/tests/rls.sql"

echo "SQL check passed."
