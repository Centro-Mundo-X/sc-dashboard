# Arquitectura

## 1. Contexto

Tesis sobre estrés laboral en personal de salud del centro de urgencias de Bello Campo
(Chacao). La intervención es una app de realidad virtual con tres escenas: toma de signos
vitales, rayos X y entrega de resultados.

Material de referencia:

- `docs/Especificacion_RV_Escenas_Tesis.pdf` — qué ocurre en cada escena y qué hay que registrar.
- `docs/Metricas de TESIS ASETARO.pdf` — cuadros de indicadores con métricas M1/M2/M3.
- `docs/Copia de Proyecto_V1_ASETARO.pdf` — anteproyecto.

Este backend no pertenece a la tesis. Sirve al proyecto VR: recibe las sesiones que produce
Unity, calcula las métricas y las muestra en un dashboard.

## 2. Principio rector

> El visor es la fuente de verdad. El backend es un consumidor que tolera fallos.

De ahí salen cuatro reglas que no se negocian:

1. Una sesión nunca depende de la red para completarse.
2. Los datos se escriben en disco del visor mientras ocurren, no al final.
3. El backend acepta reenvíos sin duplicar.
4. Un fallo del backend no hace perder una observación.

Una sesión es un participante real que firmó consentimiento. Perderla invalida esa
observación, y el centro de urgencias no tiene red garantizada.

## 3. Stack

| Capa | Elección |
|---|---|
| Runtime | Node.js 22 |
| Lenguaje | TypeScript con `strict` |
| API | Fastify 5 |
| Base de datos | SQLite con WAL |
| Driver | better-sqlite3 |
| ORM | Drizzle + drizzle-kit |
| Validación | Valibot |
| Frontend | SvelteKit 5 |
| Monorepo | pnpm workspaces |
| Logs | Pino |
| Deploy | Docker Compose |

### Valibot en vez de Zod

Es tree-shakeable por función, así que los esquemas se comparten con el front sin cargar el
validador entero. Pesa alrededor de 1.5 kB contra 14 kB.

El costo es que no hay un `fastify-type-provider` maduro para Valibot. Escribimos un adapter
propio de unas veinte líneas sobre `validatorCompiler`. Es código nuestro, con tests.

### SvelteKit en vez de React

Un solo proceso Node sirve API y dashboard con `adapter-node`, lo que simplifica el despliegue
en un contenedor. El bundle es más chico y el detalle de sesión se resuelve con `$state` y
`$derived` sin estado manual.

### SQLite en vez de Postgres

El volumen es de decenas de participantes y unos cientos de sesiones, sin concurrencia de
escritura real. SQLite ahorra un servicio en el despliegue.

Tres pragmas al abrir la conexión, siempre:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

Sin WAL, el dashboard bloquea la ingesta mientras consulta.

Si el estudio crece, Drizzle permite pasar a Postgres cambiando driver y dialecto. El esquema
es portable.

### Drizzle en vez de Prisma

SQL explícito, tipos generados sin motor binario aparte y migraciones legibles en revisión.

## 4. Estructura

```
packages/
  shared/    Esquemas Valibot y tipos. El contrato.
  db/        Esquema Drizzle, migraciones, cliente SQLite.
  metrics/   Motor M1/M2/M3. Sin IO, sin DB, sin HTTP.
apps/
  api/       Fastify. Ingesta y consulta.
  web/       SvelteKit. Dashboard.
fixtures/    Sesiones de ejemplo.
```

`shared` es el único lugar donde vive el contrato. Unity no importa TypeScript, pero
`docs/DATA-CONTRACT.md` se deriva de estos esquemas, así que un cambio se hace en un archivo.

`metrics` no toca disco ni red: recibe eventos y configuración, devuelve métricas. Se prueba
con unit tests puros y puede reusarse si algún día el visor necesita calcular algo en vivo.

## 5. Alcance

| Dentro | Fuera |
|---|---|
| Ingesta de sesiones VR | Cuestionarios (OIT-OMS y otros) |
| Cálculo de M1/M2/M3 por sesión | Comparativas pre/post y agregados |
| Dashboard de sesiones y métricas | Análisis estadístico |
| Login de usuarios internos | Administración del catálogo de casos |
| | Export de datos |

El catálogo de casos clínicos no se administra acá. Unity decide qué caso asigna y lo informa
en la cabecera de sesión con `case_id`. El backend lo guarda como contexto y no lo valida
contra ningún catálogo propio.

El dashboard **es** la herramienta de análisis. No hay export por ahora.

## 6. Modelo de datos

Se adopta sesiones múltiples por participante desde el inicio. Si el estudio corre con
pretest y postest, el modelo ya lo soporta. Si es una sola medición, `phase` queda en `single`.

```
participants 1───N sessions 1───N events
                      │
                      └──1 metric_results
users
study_config
```

| Tabla | Contenido |
|---|---|
| `participants` | Código anónimo `P01`, sin nombre. El mapeo código-persona queda fuera del sistema, en poder de la psicóloga. |
| `sessions` | Una ejecución. UUIDv7 en `client_id`. Estado de completitud y `case_id` como texto, sin clave foránea. |
| `events` | Unidad atómica con marca de tiempo. Append-only. |
| `invalid_events` | Líneas que no validaron, con motivo y contenido crudo. |
| `metric_results` | Métricas calculadas. Derivadas y recalculables. |
| `users` | Quién entra al dashboard. |
| `study_config` | Parámetros clínicos y su estado de aprobación. |

No hay tabla de casos clínicos ni de cuestionarios.

### Integridad

- `events` es append-only. Un evento que llega mal se conserva marcado: la trazabilidad es
  parte del valor probatorio.
- `metric_results` es descartable. Se borra y recalcula sin perder información.
- `client_id` identifica la sesión de forma única. Un reenvío no duplica.
- Un evento malformado no rechaza la sesión. Va a `invalid_events` y la sesión sigue viva.

## 7. Flujo

```
Unity (Quest 3)
  SessionRecorder
    ├─ event → append a session_<uuid>.jsonl en disco
    ├─ outbox con los pendientes de envío
    └─ POST /api/sessions/ingest cuando hay red

Backend
  POST /api/sessions/ingest
    ├─ valida con Valibot
    ├─ descarta duplicados por client_id
    ├─ inserta session y events en una transacción
    ├─ manda los inválidos a invalid_events
    └─ calcula métricas y escribe metric_results

Dashboard
  lista de sesiones → detalle con timeline → métricas
```

Plan C: el visor puede dejar el `.jsonl` en almacenamiento accesible por USB. Si la red falla
de forma persistente, el tesista copia los archivos y los sube con `ingest-batch`.

## 8. HTTP

### Ingesta, autenticada con token de dispositivo

| Endpoint | Qué hace |
|---|---|
| `POST /api/sessions/ingest` | Recibe una sesión en `application/x-ndjson` |
| `POST /api/sessions/ingest-batch` | Recibe varias sesiones, para el rescate por USB |

### Dashboard, autenticado con sesión de usuario

| Endpoint | Qué hace |
|---|---|
| `POST /api/auth/login` | Inicia sesión |
| `POST /api/auth/logout` | Cierra sesión |
| `GET /api/auth/me` | Usuario de la sesión actual |
| `GET /api/sessions` | Lista con filtros por participante, fase, estado y fecha |
| `GET /api/sessions/:id` | Detalle con timeline de eventos |
| `GET /api/sessions/:id/metrics` | Métricas calculadas |
| `PATCH /api/sessions/:id/incomplete-reason` | Anota el motivo de una sesión incompleta |
| `POST /api/sessions/:id/recalculate` | Recalcula métricas |

No hay endpoints de casos ni de export.

## 9. Ingesta

`POST /api/sessions/ingest` recibe una sesión completa.

- Cuerpo máximo de 2 MB.
- Token de dispositivo, separado del login del dashboard.
- Responde `200` tanto si la sesión es nueva como si ya existía. No se usa `409` porque el
  visor no necesita distinguir: en ambos casos deja de reintentar.
- Todo entra en una transacción.
- Los eventos inválidos van a `invalid_events` y la sesión no se rechaza por ellos.

### Sesiones incompletas

Una sesión sin línea de cierre, o con `scenes_completed` incompleto, se guarda con estado
`incomplete`.

Es un dato válido. Refleja una ejecución real, así que se conserva y el dashboard la muestra
marcada.

`incomplete_reason` es opcional en el cierre. Si no viene, se guarda `unknown` y el tesista lo
anota después con `PATCH /api/sessions/:id/incomplete-reason`. No se infiere el motivo a partir
de los eventos: un dato inventado es peor que uno ausente.

## 10. Métricas

El cálculo vive en `@sc/metrics` y lee `study_config`.

Las métricas se calculan en el backend, no en el visor. Si cambia un criterio clínico se
actualiza la configuración y se recalculan las sesiones. Calcular en Unity obligaría a
recompilar y redesplegar en cada visor, con el criterio enterrado en un build.

Los valores de `study_config` están cargados de forma provisional y marcados con
`approved = false`. El dashboard muestra un aviso mientras no estén aprobados, para que nadie
confunda un valor de arranque con un criterio clínico validado.

Detalle de indicadores y parámetros en `docs/METRICS.md`.

## 11. Seguridad

- Solo códigos de participante. El sistema nunca recibe nombres.
- Login dentro de la aplicación con `@fastify/session` y Argon2, sin proxy de autenticación.
- `*.sqlite` está en `.gitignore`. Un commit accidental de la base quedaría en el historial.
- El backup se hace con `sqlite3 .backup` programado.
- Los datos son de personal de una empresa real. El consentimiento informado del anteproyecto
  tiene que cubrir su almacenamiento y quién accede.

## 12. Despliegue

Un `docker compose up` en el homelab: un contenedor con API y dashboard, un volumen para
`data.sqlite` y nada más.

Variables obligatorias:

```
DEVICE_TOKEN    token que usa Unity para la ingesta
SESSION_SECRET  secreto de firma, minimo 32 caracteres
DATABASE_PATH   ruta del archivo SQLite
```

El primer usuario del dashboard se crea con la CLI:

```bash
pnpm create-user psicologa <contraseña> "Psicóloga"
```

Las contraseñas se guardan con argon2id. El login vive en la aplicacion, sin proxy de
autenticacion.

## 13. Después

Lo que no está implementado y no está decidido. Se resuelve si aparece la necesidad.

- **Cuestionarios.** OIT-OMS y autoeficacia ocupacional no los produce Unity. Hoy quedan fuera
  del backend. Incorporarlos permitiría cruzar conducta observada con estrés autorreportado.
- **Agregados.** Medias por grupo y comparativas pre/post son análisis estadístico.
- **Export.** Si la psicóloga lo pide, se agrega un endpoint de descarga.
- **Catálogo de casos.** Hoy Unity es dueño del catálogo. Administrarlo acá exigiría versionar
  los casos y guardar qué versión vio cada sesión.
- **Ingesta en vivo.** Ver una sesión en curso requeriría envío evento a evento y SSE.
- **Multi-centro.** El estudio es de un solo centro.
