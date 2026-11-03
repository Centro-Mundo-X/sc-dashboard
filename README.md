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
curl -X POST localhost:3000/api/sessions/ingest \
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

Todo en **http://localhost:3000**: el API y el dashboard comparten proceso.

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

### HTTPS es obligatorio

La imagen corre con `NODE_ENV=production`, que marca la cookie de sesión como
`Secure`. **El dashboard solo inicia sesión por HTTPS**: sobre HTTP plano el login
responde 200 pero la cookie no se guarda, y el resto de las peticiones da 401.
Hay que servirlo detrás de un proxy con TLS.

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
