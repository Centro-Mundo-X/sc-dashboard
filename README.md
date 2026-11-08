# Simulación Clínica — Backend

Backend de las sesiones de realidad virtual de la tesis sobre estrés laboral en personal de
salud del centro de urgencias de Bello Campo.

El visor Meta Quest 3 ejecuta una app Unity que registra cada sesión en disco. Este backend
recibe esas sesiones, calcula las métricas clínicas y las muestra en un dashboard.

> El visor es la fuente de verdad. El backend es un consumidor que tolera fallos.

## Arrancar

```bash
pnpm install
pnpm seed     # crea data/, la base, el usuario y carga una sesión de ejemplo
pnpm dev      # levanta el API y el dashboard
```

Abrir **http://localhost:5173** e ingresar con `demo` / `demo-access-2024`.

`pnpm seed` es idempotente: ejecutarlo dos veces no duplica nada.

Los valores de desarrollo viven en `.env.development`, que se versiona porque no contiene
secretos reales.

## Probar la ingesta

Con `pnpm dev` en ejecución:

```bash
curl -X POST localhost:5173/api/sessions/ingest \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @fixtures/session-complete.jsonl
```

## Docker

```bash
printf 'DEVICE_TOKEN=dev\nSESSION_SECRET=%s\n' "$(openssl rand -hex 20)" > .env
docker compose up -d --build
docker compose exec app node --experimental-strip-types apps/api/src/cli/create-user.ts \
  demo demo-access-2024 Demo
```

Todo en **http://localhost:3000**: el dashboard sirve la interfaz y reenvía
`/api` al API.

### Imagen publicada

`.github/workflows/image.yml` construye la imagen y la publica en GHCR cuando se
empuja un tag, o a mano desde Actions. Queda en
`ghcr.io/centro-mundo-x/sc-dashboard:<tag>`.

El workflow toma el nombre de `${{ github.repository }}`, que es
`Centro-Mundo-X/sc-dashboard`. GHCR pasa el nombre a minúsculas, así que la ruta
real lleva `centro-mundo-x`.

Compose y `pod.yaml` usan el tag `demo`, que trae datos de prueba. Ver más abajo.

### Imagen con datos de prueba

Con `SEED_DEMO_DATA=true` el contenedor prepara la base antes de arrancar: crea el
usuario del dashboard y carga la sesión de ejemplo. Es idempotente, así que
reiniciar no duplica nada.

`docker-compose.yml` y `pod.yaml` ya vienen con ese valor. En el pod, las
variables están escritas en el propio `pod.yaml`, en la lista `env`: no hace
falta un `ConfigMap` aparte.

Antes de levantarlo, cambía en `pod.yaml` el `DEVICE_TOKEN` y el `SESSION_SECRET`
por valores propios. Los que trae son marcadores.

Para una base vacía, `SEED_DEMO_DATA: "false"`. El usuario se crea aparte:

```bash
podman exec <container> node --experimental-strip-types apps/api/src/cli/create-user.ts <usuario> <clave>
```

### Detrás de un proxy con TLS

El contenedor sirve las dos cosas: el dashboard escucha en `PORT` y reenvía
`/api/*` al API, que escucha en `API_PORT` sobre el loopback. Un contenedor, un
puerto público.

| Variable | Qué hace | Por defecto |
|---|---|---|
| `PORT` | Puerto público, el del dashboard | `3000` |
| `API_PORT` | Puerto del API, solo loopback | `3001` |
| `ORIGIN` | URL pública, sin barra final. Obligatoria en producción | — |
| `TRUST_PROXY` | Direcciones a las que se cree `X-Forwarded-*` | `false` |
| `PROTOCOL_HEADER` / `HOST_HEADER` | Cabeceras con el esquema y el host públicos | `x-forwarded-proto` / `x-forwarded-host` |

La TLS la termina el proxy externo. Debe reenviar las cabeceras:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

`TRUST_PROXY` acepta una lista de direcciones y rangos CIDR, un número de saltos,
`true`, o vacío/`false` para no confiar en nadie. Un valor inválido impide el
arranque. Basta `127.0.0.1`: solo el dashboard habla con el API. Añadir rangos de
la red interna no hace falta y amplía lo que se puede falsear.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | API + dashboard con recarga |
| `pnpm seed` | Prepara la base y una sesión de ejemplo |
| `pnpm test` | Tests de los cuatro paquetes |
| `pnpm typecheck` | TypeScript en todo el workspace |
| `pnpm create-user <user> <pass>` | Crea un usuario del dashboard |

## Paquetes

```
packages/shared   ──┐
packages/db       ──┼──► apps/api    (ingesta y consulta, puerto 3000)
packages/metrics  ──┘
                   └──► apps/web    (dashboard, puerto 5173; reenvía /api)
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
