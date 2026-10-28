#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
container_name="motomanager-cache-test-$$"
trap 'docker rm -f "$container_name" >/dev/null 2>&1 || true' EXIT
docker run --rm -d --name "$container_name" -p 127.0.0.1::6379 redis:7.4.8-alpine redis-server --save '' --appendonly no >/dev/null
for attempt in {1..30}; do
  if [ "$(docker exec "$container_name" redis-cli ping 2>/dev/null)" = PONG ]; then break; fi
  sleep 1
done
redis_test_address="$(docker port "$container_name" 6379/tcp)"
TEST_REDIS_URL="redis://127.0.0.1:${redis_test_address##*:}" NODE_OPTIONS="${NODE_OPTIONS:-} --conditions=react-server" ./node_modules/.bin/tsx --test tests/cache-real.test.ts
