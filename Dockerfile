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
EXPOSE 3000

# No `curl` in this image: the check goes through the dashboard to the API.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Runs the seed first when SEED_DEMO_DATA=true, then the server.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
