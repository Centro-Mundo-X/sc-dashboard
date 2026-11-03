# Simulación Clínica — Backend

Backend de las sesiones de realidad virtual de la tesis sobre estrés laboral en personal de
salud del centro de urgencias de Bello Campo.

El visor Meta Quest 3 ejecuta una app Unity que registra cada sesión en disco. Este backend
recibe esas sesiones, calcula las métricas clínicas y las muestra en un dashboard.

> El visor es la fuente de verdad. El backend es un consumidor que tolera fallos.

## Documentación

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack, decisiones, modelo de datos
- [`docs/DATA-CONTRACT.md`](docs/DATA-CONTRACT.md) — qué escribe Unity y qué acepta el backend
- [`docs/METRICS.md`](docs/METRICS.md) — cálculo de M1/M2/M3
- [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) — idioma de docs, código y endpoints

## Estructura

```
packages/
  shared/    Esquemas Valibot y tipos
  db/        Esquema Drizzle y migraciones
  metrics/   Motor de métricas, sin IO
apps/
  api/       Fastify
  web/       SvelteKit
fixtures/    Sesiones de ejemplo
```

## Desarrollo

```bash
pnpm install
pnpm test
```

Cargar una sesión de ejemplo y ver el dashboard:

```bash
# API
DATABASE_PATH=./data/data.sqlite DEVICE_TOKEN=dev \
  SESSION_SECRET=$(openssl rand -hex 20) \
  pnpm --filter @sc/api start

# Usuario del dashboard
pnpm create-user psicologa una-contraseña-larga "Psicóloga"

# Ingesta del fixture
curl -X POST localhost:3000/api/sessions/ingest \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @fixtures/session-complete.jsonl

# Dashboard
pnpm --filter @sc/web dev
```

## Despliegue

```bash
DEVICE_TOKEN=... SESSION_SECRET=... docker compose up -d
```

El volumen `sc-data` guarda el archivo SQLite. Sin él, los datos se pierden al recrear el
contenedor.
