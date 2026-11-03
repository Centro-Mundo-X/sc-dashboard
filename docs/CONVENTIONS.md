# Convenciones del proyecto

Este documento fija las reglas de nomenclatura y escritura. Existe porque los primeros
borradores mezclaban español e inglés en el mismo artefacto, y corregirlo después de escribir
código cuesta mucho más que respetarlo desde el principio.

## 1. Regla general

| Artefacto | Idioma |
|---|---|
| Documentación (prosa, títulos, tablas descriptivas) | **Español** |
| Nombres de archivos de documentación | Español (`ARQUITECTURA.md`) salvo que ya existan en inglés |
| Código fuente | **Inglés** |
| Comentarios de código | **Inglés** |
| Nombres de variables, funciones, tipos, clases | **Inglés** |
| Nombres de tablas y columnas de base de datos | **Inglés** |
| Rutas de endpoints | **Inglés** |
| Claves y valores del contrato JSON | **Inglés** |
| Mensajes de error de la API | **Inglés** |
| Mensajes de la interfaz de usuario | **Español** |
| Mensajes de commit | **Inglés** |

El principio: **lo que viaja por el cable y lo que lee una máquina, en inglés. Lo que lee una
persona en un documento, en español.**

## 2. Por qué el contrato JSON en inglés

El `.jsonl` de sesión y los cuerpos HTTP son interfaz entre dos bases de código (Unity en C#,
backend en TypeScript) y potencialmente clientes futuros. Los valores enumerados viajan como
cadenas y se convierten en constantes en cada lenguaje. Usar inglés evita:

- Mezclar idiomas dentro de un mismo payload (`{"scene": "signos_vitales"}` es inconsistente).
- Problemas de codificación al pasar por herramientas que no asumen UTF-8.
- Fricción cuando alguien externo al proyecto lea el contrato.

Los documentos siguen en español porque los lee el equipo y la psicóloga.

## 3. Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Tablas SQL | `snake_case`, plural | `sessions`, `metric_results` |
| Columnas SQL | `snake_case` | `participant_code`, `occurred_at` |
| Campos JSON | `snake_case` | `client_id`, `event_id` |
| Valores de enum JSON | `snake_case` | `vital_signs`, `cuff_placed` |
| Tipos e interfaces TS | `PascalCase` | `Session`, `MetricResult` |
| Funciones y variables TS | `camelCase` | `parseSessionJsonl`, `eventCount` |
| Constantes | `SCREAMING_SNAKE_CASE` | `SUPPORTED_CONTRACT_VERSION` |
| Archivos TS | `kebab-case` | `parse-session.ts` |
| Rutas HTTP | `kebab-case`, plural, sustantivos | `/api/sessions`, `/api/metric-results` |

## 4. Rutas HTTP

Todas bajo `/api`. Recursos en plural. Verbos HTTP con su significado estándar.

```
POST   /api/sessions/ingest          Ingesta de una sesión (token de dispositivo)
POST   /api/sessions/ingest-batch    Ingesta por lote (token de dispositivo)
POST   /api/auth/login               Login del dashboard
POST   /api/auth/logout              Cerrar sesión
GET    /api/sessions                 Lista con filtros
GET    /api/sessions/:id             Detalle
GET    /api/sessions/:id/metrics     Métricas calculadas
PATCH  /api/sessions/:id/incomplete-reason   Anotar motivo
POST   /api/sessions/:id/recalculate         Recalcular métricas
GET    /api/exports/sessions.csv     Export de métricas
GET    /api/exports/events.csv       Export de eventos crudos
```

No se usan verbos en la ruta (`/getSessions`) ni `snake_case` (`/api/metric_results`).

## 5. Documentación

- Prosa, títulos, explicaciones y tablas descriptivas: **español**.
- Nombres de tablas, columnas, campos, valores y rutas citados dentro del texto: en su forma
  **real de código** (inglés), entre comillas invertidas. No se traducen ni se parafrasean.
- Los ejemplos de JSON y de fragmentos de código no se traducen nunca.

Ejemplo correcto:

> El campo `participant_code` identifica al participante de forma anónima. La tabla
> `sessions` guarda una fila por ejecución.

Ejemplo incorrecto:

> El campo "código de participante" identifica al participante. La tabla "sesiones" guarda
> una fila por ejecución.

## 6. Idioma de la interfaz

El dashboard lo usa personal del centro de urgencias en Caracas. La interfaz va en **español**,
pero el código que la construye está en inglés:

```svelte
<!-- Correcto: etiqueta en español, código en inglés -->
<label>{labels.participantCode}</label>
```

Las cadenas visibles se concentran en un único módulo de traducción, no dispersas en los
componentes.
