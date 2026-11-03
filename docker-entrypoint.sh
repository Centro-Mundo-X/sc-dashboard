#!/bin/sh
#
# Container entrypoint.
#
# With SEED_DEMO_DATA=true the database is prepared once, with a dashboard user
# and the sample session, then the server starts. Without it nothing is seeded
# and the image behaves like the production one.
#
# Seeding is idempotent: the seed skips a user that already exists and an
# already-ingested session, so restarting the container is safe.
set -e

if [ "$SEED_DEMO_DATA" = "true" ]; then
  node --experimental-strip-types apps/api/src/cli/seed.ts
fi

exec node --experimental-strip-types apps/api/src/main.ts
