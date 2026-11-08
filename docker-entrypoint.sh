#!/bin/sh
#
# Container entrypoint.
#
# One container, two processes: the dashboard built with adapter-node listens on
# PORT and forwards /api to the API, which stays on the loopback.
#
# With SEED_DEMO_DATA=true the database is prepared once before either starts.
# Seeding is idempotent, so restarting the container is safe.
set -e

WEB_PORT="${PORT:-3000}"
API_PORT="${API_PORT:-3001}"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:$API_PORT}"

# Behind a TLS proxy. Set TRUST_PROXY=false only if the API is served over plain
# HTTP; any other value is left untouched.
TRUST_PROXY="${TRUST_PROXY:-true}"

# Without these the dashboard builds its origin from the socket and answers 403.
PROTOCOL_HEADER="${PROTOCOL_HEADER:-x-forwarded-proto}"
HOST_HEADER="${HOST_HEADER:-x-forwarded-host}"

if [ -z "${ORIGIN:-}" ]; then
  echo "ORIGIN is not set. The dashboard will assume http://localhost:$WEB_PORT" >&2
  echo "and reject logins from any other address. Set it to the public URL," >&2
  echo "e.g. ORIGIN=https://sc.example.com" >&2
fi

export API_PORT API_BASE_URL TRUST_PROXY PROTOCOL_HEADER HOST_HEADER ORIGIN

if [ "$SEED_DEMO_DATA" = "true" ]; then
  node --experimental-strip-types apps/api/src/cli/seed.ts
fi

node --experimental-strip-types apps/api/src/main.ts &
api_pid=$!

# The dashboard stays in the foreground as the main process. If it exits, the
# container ends and takes the API with it.
trap 'kill "$api_pid" 2>/dev/null' EXIT INT TERM

PORT="$WEB_PORT" node apps/web/build/index.js &
web_pid=$!

wait "$web_pid"
