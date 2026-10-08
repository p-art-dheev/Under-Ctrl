#!/usr/bin/env bash
# Applies the migration to a throwaway Postgres (with a Supabase role/auth stub)
# and runs the two-user authorization checks. Requires Docker.
set -euo pipefail
cd "$(dirname "$0")/.."
name=skillforge-sqltest
docker rm -f $name >/dev/null 2>&1 || true
docker run -d --name $name -e POSTGRES_PASSWORD=pg postgres:16-alpine >/dev/null
trap 'docker rm -f $name >/dev/null' EXIT
until docker exec $name pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
sleep 1
run() { docker exec -i $name psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
run < supabase/tests/00_supabase_stub.sql
run < supabase/migrations/20261008000000_skillforge.sql
run < supabase/tests/rls_test.sql
