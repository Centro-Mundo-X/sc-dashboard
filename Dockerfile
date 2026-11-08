FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/metrics/package.json packages/metrics/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY . .
RUN pnpm --filter @sc/web exec vite build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
RUN mkdir -p /app/data
# The dashboard. The API stays internal.
#
# No HEALTHCHECK here: how a running instance is probed belongs to whoever runs
# it (compose `healthcheck`, a pod's probes). Written in the image it is also
# dropped, since the OCI format has no field for it.
EXPOSE 8080

# Runs the seed first when SEED_DEMO_DATA=true, then the server.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
