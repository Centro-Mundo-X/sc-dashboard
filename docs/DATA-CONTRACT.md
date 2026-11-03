# Contrato de datos — Sesión VR

Versión **1.0** · Estado: **borrador para revisión con el equipo Unity**

Define qué escribe la app Unity y qué acepta el backend. Unity implementa el escritor,
el backend el lector. El archivo local tiene el mismo formato que el cuerpo de
`POST /api/sessions/ingest`.

La prosa va en español y los identificadores en inglés, según [`CONVENTIONS.md`](CONVENTIONS.md).

## 1. Formato de transporte

JSON Lines (`.jsonl`): un objeto JSON por línea, UTF-8, sin comas entre líneas.

```
línea 1  →  cabecera de sesión     (tipo: "session")
línea 2  →  evento                 (tipo: "event")
línea 3  →  evento
...
línea N  →  cierre de sesión       (tipo: "close")
```

Si el visor se apaga a mitad de la sesión, lo escrito hasta ahí se recupera sin parsear el
archivo completo. Un JSON único se corrompe y se pierde entero.

**En Unity:** `File.AppendAllText` más `FileStream.Flush(true)` después de cada línea. No
acumular en memoria para escribir al final.

## 2. Identificadores

| Campo | Formato | Quién lo genera |
|---|---|---|
| `client_id` | UUIDv7 en minúsculas | El visor, al iniciar la sesión |
| `participant_code` | `P` + 2 dígitos (`P01`, `P12`) | El tesista, manualmente en el visor |
| `case_id` | slug en minúsculas (`case-01-chest-pain`) | **El visor (Unity)** — catálogo y asignación son de Unity |
| `event_id` | Entero incremental desde 1, único por sesión | El visor |

`client_id` es la clave de idempotencia: si la sesión se envía tres veces, se guarda una.
El visor genera el UUID una vez y lo persiste junto al `.jsonl`, sin regenerarlo al reintentar.

## 3. Cabecera

```json
{
  "type": "session",
  "contract_version": "1.0",
  "client_id": "0192f3a4-5b6c-7d8e-9f01-234567890abc",
  "participant_code": "P01",
  "phase": "single",
  "case_id": "case-01-chest-pain",
  "started_at": "2026-11-04T14:32:10.000Z",
  "app_version": "0.9.3",
  "device": {
    "model": "Meta Quest 3",
    "os_version": "Horizon OS 74"
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `type` | `"session"` | sí | Discriminante de línea |
| `contract_version` | string `"1.0"` | sí | Versión de este documento |
| `client_id` | UUIDv7 | sí | Clave de idempotencia |
| `participant_code` | `^P\d{2}$` | sí | Código anónimo |
| `phase` | `"single" \| "pretest" \| "posttest"` | sí | Etapa del estudio |
| `case_id` | slug | sí | Caso asignado por Unity. El backend lo guarda como contexto y **no lo valida** contra catálogo propio: no conoce los casos disponibles. |
| `started_at` | ISO 8601 UTC | sí | Con `Z`, milisegundos |
| `app_version` | string semver | sí | Build de Unity |
| `device` | objeto | sí | `model` y `os_version` |

`phase` existe aunque el estudio tenga una sola medición. Con `single` el modelo no cambia, y
si más adelante hay pretest y postest tampoco hace falta migrar.

## 4. Evento

```json
{
  "type": "event",
  "event_id": 17,
  "occurred_at": "2026-11-04T14:35:02.341Z",
  "scene": "vital_signs",
  "procedure": "blood_pressure",
  "action": "cuff_placed",
  "object": "adult_cuff",
  "value": "adult",
  "outcome": "completed",
  "context": { "arm": "left" }
}
```

### 4.1 Campos

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `type` | `"event"` | sí | Discriminante |
| `event_id` | entero ≥ 1 | sí | Incremental por sesión |
| `occurred_at` | ISO 8601 UTC | sí | Marca de tiempo del evento |
| `scene` | enum | sí | Ver 4.2 |
| `procedure` | enum | sí | Ver 4.3 |
| `action` | string snake_case | sí | Ver 4.4 |
| `object` | string \| null | no | Elemento 3D involucrado |
| `value` | string \| number \| null | no | Dato introducido o mostrado |
| `outcome` | enum | sí | Ver 4.5 |
| `context` | objeto | no | Pares clave-valor adicionales |

### 4.2 `scene`

| Valor | Corresponde a |
|---|---|
| `lobby` | Menú inicial, selección de participante |
| `vital_signs` | Escena 1 — toma de signos vitales |
| `x_ray` | Escena 2 — toma de rayos X |
| `results_delivery` | Escena 3 — entrega y validación |
| `report` | Reporte final |

### 4.3 `procedure`

| Valor | Escena | Descripción |
|---|---|---|
| `none` | cualquiera | Evento de sesión o navegación |
| `breathing` | vital_signs | Respiración (FR) |
| `blood_pressure` | vital_signs | Presión arterial |
| `pulse` | vital_signs | Pulso |
| `vitals_integration` | vital_signs | Finalización de la ficha |
| `identity_verification` | x_ray | Contraste de identificadores |
| `patient_preparation` | x_ray | Instrucciones previas |
| `image_capture` | x_ray | Activación de la captura |
| `image_review` | x_ray | Revisión del resultado |
| `correspondence` | results_delivery | Ficha / imagen / informe |
| `text_validation` | results_delivery | Clasificación de frases |
| `inconclusive` | results_delivery | Reconocimiento de informe preliminar |
| `explanation` | results_delivery | Comunicación al paciente |
| `comprehension` | results_delivery | Verificación de comprensión |

Los nueve primeros corresponden a los indicadores de los cuadros de métricas. Los cinco de
`results_delivery` salen de la Escena 3 de la especificación RV.

### 4.4 `action`

`snake_case`, libre pero **estable**. Es la unidad que el motor de métricas interpreta, así
que agregar una acción requiere decodificarla. Catálogo inicial derivado de la especificación
RV; el equipo Unity debe proponer las que falten antes de implementarlas.

| Escena | Acciones |
|---|---|
| `vital_signs` | `scene_started`, `gaze_chest`, `monitor_checked`, `value_recorded`, `drawer_opened`, `cuff_selected`, `cuff_placed`, `sphygmomanometer_activated`, `reading_displayed`, `wrist_touched`, `value_corrected`, `chart_finalized`, `scene_ended` |
| `x_ray` | `scene_started`, `console_opened`, `wristband_read`, `identification_dialogue`, `study_selected`, `phrase_communicated`, `patient_confirmed`, `capture_activated`, `image_displayed`, `image_reviewed`, `scene_ended` |
| `results_delivery` | `scene_started`, `panel_opened`, `identifiers_compared`, `report_corrected`, `phrase_classified`, `report_status_recognized`, `verbal_response`, `comprehension_asked`, `consultation_closed` |
| `lobby` | `session_started`, `case_assigned`, `session_finished` |

### 4.5 `outcome`

| Valor | Significado |
|---|---|
| `started` | La acción comenzó |
| `completed` | La acción se completó correctamente |
| `omitted` | La acción aplicable no se realizó |
| `corrected` | Hubo una corrección antes de confirmar |
| `cancelled` | Se inició y se abandonó |
| `not_applicable` | No aplicaba para este caso |

`omitted` es un resultado observable, no un error. El sistema registra sin bloquear y no
interpreta la ausencia como fallo clínico. Esa interpretación ocurre al calcular métricas,
contra las reglas de `study_config`.

### 4.6 `context`

Objeto plano, hasta 8 claves, valores `string`, `number` o `boolean`. Sirve para datos del
evento sin ampliar el esquema: `{"arm": "left"}`, `{"phrase_id": 3}`, `{"matches": true}`.

Nunca incluir datos identificatorios: sin nombres, sin documentos, sin historias clínicas.

## 5. Cierre

```json
{
  "type": "close",
  "finished_at": "2026-11-04T14:52:47.112Z",
  "duration_ms": 1237112,
  "scenes_completed": ["vital_signs", "x_ray", "results_delivery"],
  "total_events": 84,
  "incomplete_reason": "participant_abandoned"
}
```

| Campo | Tipo | Obligatorio |
|---|---|---|
| `type` | `"close"` | sí |
| `finished_at` | ISO 8601 UTC | sí |
| `duration_ms` | entero ≥ 0 | sí |
| `scenes_completed` | array de enum `scene` | sí |
| `total_events` | entero ≥ 0 | sí |
| `incomplete_reason` | enum | **no** |

### 5.1 `incomplete_reason`

| Valor | Cuándo |
|---|---|
| `participant_abandoned` | El participante decidió detenerse |
| `technical_failure` | Error del visor o del hardware |
| `timeout` | La sesión excedió el tiempo máximo |
| `other` | Otro motivo, descripto en el dashboard |
| `unknown` | El visor no alcanzó a informarlo |

Es opcional y se omite cuando la sesión se completó. Si quedó incompleta y el visor no
alcanzó a escribirlo, el backend guarda `unknown` y el tesista lo anota después desde el
dashboard. El backend no infiere el motivo a partir de los eventos.

### 5.2 Sesión completa vs. incompleta

`scenes_completed` distingue una sesión completa de una abandonada. La abandonada es un dato
válido: el backend la marca `incomplete` y no la descarta.

Si la app se cierra sin escribir esta línea, queda `incomplete` con motivo `unknown`.

## 6. Contrato HTTP

### `POST /api/sessions/ingest`

Cuerpo: `application/x-ndjson`, el mismo contenido del `.jsonl`.

```
Authorization:  Bearer <DEVICE_TOKEN>
Tamaño máximo:  2 MB
```

Respuestas:

| Código | Situación |
|---|---|
| `200` | Aceptada (nueva o ya existente — el visor no distingue) |
| `400` | La cabecera no supera validación. El visor no debe reintentar. |
| `401` | Token inválido |
| `413` | Supera 2 MB |
| `500` | Error del backend. El visor **debe reintentar**. |

Respuesta `200`:

```json
{
  "client_id": "0192f3a4-...",
  "status": "accepted",
  "duplicate": false,
  "events_received": 84,
  "invalid_events": 0
}
```

`duplicate: true` indica que ya existía. El visor elimina el archivo del outbox en ambos casos.

### `POST /api/sessions/ingest-batch`

Recibe varias sesiones para el rescate manual por USB.

```json
{
  "sessions": [ "<contenido de un .jsonl>", "<otro>" ]
}
```

Cada elemento se procesa por separado y la respuesta informa el resultado por `client_id`:

```json
{
  "results": [
    { "client_id": "0192f3a4-...", "status": "accepted", "duplicate": false },
    { "client_id": "0192f3a5-...", "status": "rejected", "error": "invalid header at line 1" }
  ]
}
```

### Estrategia de reintento en el visor

1. Al cerrar la sesión, intentar `POST /api/sessions/ingest`.
2. Si falla por red o `5xx`: dejar el archivo en `outbox/` y reintentar al abrir la app o
   cada 5 minutos.
3. Si `400`: mover a `outbox/rejected/` y no reintentar. Requiere revisión humana.
4. Nunca borrar el `.jsonl` original hasta recibir `200`.

## 7. Ejemplo completo

Ver [`fixtures/session-complete.jsonl`](../fixtures/session-complete.jsonl).

## 8. Cambios de versión

`contract_version` es semver:

- **Parche**: campos opcionales nuevos. Se aceptan versiones anteriores.
- **Menor**: enumeraciones ampliadas. Los valores desconocidos se guardan sin interpretar.
- **Mayor**: campos obligatorios nuevos o renombrados. Se rechaza con `400`.

El backend acepta `1.x`. Un `2.x` se rechaza explícitamente para no corromper datos.
