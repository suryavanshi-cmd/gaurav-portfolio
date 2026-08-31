#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
#  Full test suite.
#
#  Starts a throwaway Postgres, applies the real migrations against it,
#  and runs every suite. Needs no credentials and touches no live service.
#
#      bash tests/run.sh
#
#  Requires: postgresql server binaries (initdb, pg_ctl) and psql.
#  On Debian/Ubuntu:  sudo apt-get install -y postgresql
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Postgres refuses to initdb as root. Drop to an unprivileged user and re-exec
# rather than failing with an opaque message.
if [ "$(id -u)" = "0" ]; then
  TEST_USER="${PG_TEST_USER:-raktatest}"
  id -u "$TEST_USER" >/dev/null 2>&1 || useradd -m "$TEST_USER" 2>/dev/null || true
  if id -u "$TEST_USER" >/dev/null 2>&1; then
    echo "→ running as root; re-executing the suite as $TEST_USER"
    WORK="$(mktemp -d)"; chown -R "$TEST_USER" "$WORK"
    exec su "$TEST_USER" -c "PGDATA_DIR='$WORK/pgdata' SOCK='$WORK' PATH='$PATH' bash '${BASH_SOURCE[0]}'"
  fi
  echo "❌ Cannot run as root and could not create an unprivileged user." >&2
  echo "   Run as a normal user, or set PG_TEST_USER to one that exists." >&2
  exit 1
fi
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1 || true)}"
[ -n "$PGBIN" ] && export PATH="$PGBIN:$PATH"

command -v initdb >/dev/null || { echo "❌ initdb not found. Install postgresql, or set PGBIN." >&2; exit 1; }

PGDATA_DIR="${PGDATA_DIR:-$(mktemp -d)/pgdata}"
SOCK="${SOCK:-$(mktemp -d)}"
PORT="${PGPORT:-5433}"
export PGHOST="$SOCK" PGPORT="$PORT" PGUSER=postgres PGDATABASE=rakta

cleanup() { pg_ctl -D "$PGDATA_DIR" stop -m immediate >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "→ starting a throwaway Postgres on port $PORT"
initdb -D "$PGDATA_DIR" -A trust -U postgres >/dev/null
pg_ctl -D "$PGDATA_DIR" -o "-k $SOCK -p $PORT -c listen_addresses=" -w start >/dev/null
createdb -h "$SOCK" -p "$PORT" -U postgres rakta

PSQL="psql -h $SOCK -p $PORT -U postgres -d rakta -v ON_ERROR_STOP=1 -q"
echo "→ applying migrations"
$PSQL -f "$ROOT/tests/sql/00-supabase-stub.sql"
for m in "$ROOT"/supabase/migrations/*.sql; do
  echo "   $(basename "$m")"
  $PSQL -f "$m" 2>&1 | grep -v "NOTICE" || true
done

FAILED=0
run() { echo ""; echo "══ $1 ══"; shift; "$@" || FAILED=1; }

run "billing arithmetic + signatures (offline)" node "$ROOT/scripts/billing-selftest.js"
run "credit SQL functions" $PSQL -f "$ROOT/tests/sql/credit-functions.test.sql"
run "concurrency: no overdraw" bash "$ROOT/tests/sql/concurrency.sh" "$SOCK" "$PORT"
run "billing over HTTP" node "$ROOT/tests/billing.test.mjs"
run "report store over HTTP" node "$ROOT/tests/store.test.mjs"

echo ""
if [ $FAILED -eq 0 ]; then echo "✅ ALL SUITES PASSED"; else echo "❌ SOME SUITES FAILED"; fi
exit $FAILED
