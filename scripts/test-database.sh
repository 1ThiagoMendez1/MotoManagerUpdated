#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
container_name="motomanager-sql-test-$$"
cleanup() { docker rm -f "$container_name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# Isolated, disposable database; never connects to DATABASE_URL or production.
docker run --rm -d --name "$container_name" --network none \
  --tmpfs /var/lib/postgresql/data \
  -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=regression \
  postgres@sha256:b8faeff7712663c2773a190181e1246e37e364b887611c04658c28b44e2408fe >/dev/null
for attempt in {1..40}; do
  if docker exec "$container_name" pg_isready -U postgres -d regression >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container_name" mkdir -p /tmp/motomanager
docker cp "$repo_dir/supabase" "$container_name:/tmp/motomanager/supabase"
docker cp "$repo_dir/tests" "$container_name:/tmp/motomanager/tests"
docker cp "$repo_dir/scripts/performance-indexes.sql" "$container_name:/tmp/motomanager/indexes.sql"
docker exec "$container_name" psql -U postgres -d regression -v ON_ERROR_STOP=1 -f /tmp/motomanager/tests/database-bootstrap.sql
docker exec "$container_name" psql -U postgres -d regression -v ON_ERROR_STOP=1 -f /tmp/motomanager/indexes.sql
