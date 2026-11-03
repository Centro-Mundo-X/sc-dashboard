# Simulación Clínica — Backend

Backend de las sesiones de realidad virtual de la tesis sobre estrés laboral en personal de
salud del centro de urgencias de Bello Campo.

El visor Meta Quest 3 ejecuta una app Unity que registra cada sesión en disco. Este backend
recibe esas sesiones, calcula las métricas clínicas y las muestra en un dashboard.

> El visor es la fuente de verdad. El backend es un consumidor que tolera fallos.

## Arrancar para probar

```bash
pnpm install
pnpm seed     # crea data/, la base, el usuario y carga una sesión de ejemplo
pnpm dev      # levanta el API y el dashboard
```

Abrí **http://localhost:5173** y entrá con `psicologa` / `clave-de-prueba`.

`pnpm seed` es idempotente: si lo corrés dos veces no duplica nada.

Los valores de desarrollo viven en `.env.development`, que sí se versiona porque no
contiene secretos reales.

## Probar la ingesta

Con `pnpm dev` corriendo:

```bash
curl -X POST localhost:3000/api/sessions/ingest \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @fixtures/session-complete.jsonl
```

## Docker

```bash
printf 'DEVICE_TOKEN=dev\nSESSION_SECRET=%s\n' "$(openssl rand -hex 20)" > .env
docker compose up -d --build
docker compose exec app node --experimental-strip-types apps/api/src/cli-create-user.ts \
  psicologa clave-de-prueba Psicóloga
```

Todo en **http://localhost:3000**: el API y el dashboard comparten proceso.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | API + dashboard con recarga |
| `pnpm seed` | Prepara la base y una sesión de ejemplo |
| `pnpm test` | Tests de los cuatro paquetes |
| `pnpm typecheck` | TypeScript en todo el workspace |
| `pnpm create-user <user> <pass>` | Crea un usuario del dashboard |

## Por qué está separado en paquetes

```
packages/shared   ──┐
packages/db       ──┼──► apps/api    (ingesta y consulta, puerto 3000)
packages/metrics  ──┘
                   └──► apps/web    (dashboard, puerto 5173)
```

- `shared` — esquemas Valibot y tipos. El contrato, en un solo lugar.
- `db` — esquema Drizzle. Lo usan el API (escribe) y el web (lee).
- `metrics` — motor de M1/M2/M3. Sin base de datos, sin red, sin reloj: se prueba con unit
  tests puros y puede reusarse si el visor necesita calcular algo en vivo.

Para trabajar no hace falta conocer la separación: `pnpm dev` arranca los dos procesos.

## Documentación

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack, decisiones, modelo de datos
- [`docs/DATA-CONTRACT.md`](docs/DATA-CONTRACT.md) — qué escribe Unity y qué acepta el backend
- [`docs/METRICS.md`](docs/METRICS.md) — cálculo de M1/M2/M3
- [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) — idioma de docs, código y endpoints
