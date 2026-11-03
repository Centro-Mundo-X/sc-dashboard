# Métricas

Fuente: los cuadros de `docs/Metricas de TESIS ASETARO.pdf` y la ruta de jugabilidad de
`docs/Especificacion_RV_Escenas_Tesis.pdf`.

Los identificadores van en inglés por `CONVENTIONS.md`. El texto, en español.

## 1. Dónde se calculan

En el backend, nunca en el visor.

Si cambia un criterio clínico se actualiza `study_config` y se recalculan las sesiones. Calcular
en Unity obligaría a recompilar y redesplegar en cada visor, y el criterio quedaría enterrado
en un build sin trazabilidad.

`@sc/metrics` es puro: recibe eventos y configuración, devuelve métricas. Sin DB, sin red, sin
reloj. Se prueba con unit tests.

## 2. Qué devuelve cada indicador

Hasta tres métricas.

| Métrica | Qué mide | Ejemplo |
|---|---|---|
| M1 | Si se completó la conducta esperada | `observation_completed` |
| M2 | Si lo registrado coincide con lo mostrado o esperado | `cuff_matches` |
| M3 | Tiempo hasta el registro, o si hubo corrección previa | `time_to_record_ms` |

El tipo depende del cuadro de origen. La implementación usa una unión discriminada para que
cada métrica guarde lo que corresponde sin campos nulos ambiguos.

## 3. No penalizar

La especificación RV dice que el sistema registra sin bloquear, y que los eventos observables
no se interpretan automáticamente como aciertos ni errores. El motor respeta eso:

1. `outcome: "omitted"` es un dato, no un fallo. Se cuenta donde el cuadro lo pida.
2. Usar una vía alternativa válida no penaliza. Ver la respiración en el monitor en lugar del
   tórax, o tomar el pulso en el monitor en lugar de la muñeca, son vías que la configuración
   declara válidas o inválidas.
3. Corregir un valor antes de confirmar es conducta válida y se registra como `corrected`.
4. Un campo pendiente porque el escenario no dio el dato no es omisión.
5. Si falta el evento que probaría la conducta, el resultado es `not_evaluable`, no `false`.

El punto 5 importa: un indicador sin datos no es un indicador fallido. Confundirlos sesga el
análisis.

## 3.1 Lo que el backend no juzga

El backend registra y calcula. **No decide si un valor es bueno o malo.**

Un `false` en `cuff_matches` es un déficit. Un `false` en `corrected_before_confirm` es lo
correcto: el participante no necesitó corregir. Un `0` en `improper_final_communications` es
lo deseable, mientras que un `0` en `checks_completed_ratio` es un déficit.

El motor devuelve el valor y nada más. El dashboard no colorea por bueno o malo; solo marca
lo que no se pudo evaluar.

Para colorear haría falta declarar la polaridad de cada métrica (`positive`, `negative`,
`neutral`), y eso es una decisión clínica sobre qué conducta se considera deseable. Queda
pendiente de definir con la psicóloga. Hasta entonces, el color no opina.

## 4. Indicadores

Cada indicador agrupa los eventos de un `procedure`.

| Indicador | Escena | `procedure` | M1 | M2 | M3 |
|---|---|---|---|---|---|
| `breathing` | `vital_signs` | `breathing` | Observación completada | Concordancia con la clave | Tiempo hasta el registro |
| `bp_preparation` | `vital_signs` | `blood_pressure` | Comprobaciones completadas | Brazalete concordante | — |
| `bp_measurement` | `vital_signs` | `blood_pressure` | Lectura registrada | Concordancia lectura/ficha | — |
| `pulse` | `vital_signs` | `pulse` | Revisión realizada | Concordancia mostrado/registrado | Corrección antes de confirmar |
| `vitals_integration` | `vital_signs` | `vitals_integration` | Signos correctos de 3 | Campos omitidos | Discordancias lectura-ficha |
| `identity_verification` | `x_ray` | `identity_verification` | Comprobaciones realizadas | Estudio seleccionado vs solicitado | Activaciones antes de completar |
| `patient_preparation` | `x_ray` | `patient_preparation` | Instrucciones comunicadas | Confirmación del paciente | Captura antes de completar |
| `image_capture` | `x_ray` | `image_capture` | Captura ejecutada | — | — |
| `image_review` | `x_ray` | `image_review` | Revisión realizada | Defecto detectado | Tiempo de revisión |
| `correspondence` | `results_delivery` | `correspondence` | Identificadores comprobados | Informe correcto | Comunicaciones antes de verificar |
| `text_validation` | `results_delivery` | `text_validation` | Frases bien clasificadas | No respaldadas aceptadas | Correcciones antes de comunicar |
| `inconclusive` | `results_delivery` | `inconclusive` | Reconoce el estado | Comunicaciones improcedentes | Solicitudes de aclaración |
| `explanation` | `results_delivery` | `explanation` | Mensajes concordantes | Afirmaciones no respaldadas | Información relevante omitida |
| `comprehension` | `results_delivery` | `comprehension` | Comprobación realizada | Malentendidos aclarados | Instrucciones comprendidas |

`bp_preparation` y `bp_measurement` comparten `procedure` porque el cuadro separa preparación
de medición, pero los eventos llegan juntos.

Nombres que usa la implementación. El dashboard muestra una descripción de una línea por
cada métrica al pasar el cursor; viven en `apps/web/src/lib/labels.ts` (`metricDescription`) y
describen qué cuenta el número, no cómo se calcula.

| Indicador | M1 | M2 | M3 |
|---|---|---|---|
| `breathing` | `observation_completed` | `matches_key` | `time_to_record_ms` |
| `bp_preparation` | `checks_completed_ratio` | `cuff_matches` | — |
| `bp_measurement` | `reading_recorded` | `reading_matches_chart` | — |
| `pulse` | `review_performed` | `matches_displayed` | `corrected_before_confirm` |
| `vitals_integration` | `correct_vitals_of_three` | `omitted_fields` | `chart_discrepancies` |
| `identity_verification` | `checks_completed_ratio` | `study_matches_request` | `activations_before_check` |
| `patient_preparation` | `instructions_ratio` | `patient_confirmed` | `capture_before_prep` |
| `image_capture` | `capture_executed` | — | — |
| `image_review` | `review_performed` | `defect_detected` | `review_duration_ms` |
| `correspondence` | `identifiers_ratio` | `report_correct` | `communications_before_check` |
| `text_validation` | `phrases_classified_ratio` | `unsupported_accepted` | `corrections_before_communicating` |
| `inconclusive` | `status_recognized` | `improper_final_communications` | `clarification_requests` |
| `explanation` | `messages_concordant_ratio` | `unsupported_claims` | `relevant_info_omitted` |
| `comprehension` | `check_performed` | `misunderstandings_resolved` | `instructions_understood_ratio` |

## 5. Parámetros

Los valores que el motor necesita viven en dos lugares, según a qué apliquen.

### 5.1 Globales, en `study_config`

Aplican a toda sesión, sea cual sea el caso.

| Clave | Tipo | Qué define |
|---|---|---|
| `min_gaze_ms` | entero | Tiempo mínimo de mirada al tórax que cuenta como observación |
| `valid_pulse_sources` | array | Vías válidas del pulso: `wrist`, `monitor` o ambas |
| `valid_breathing_sources` | array | Vías válidas de la respiración: `chest`, `monitor` o ambas |
| `bp_required_checks` | array | Comprobaciones exigidas antes de medir la presión |

### 5.2 Por caso, en `cases.criteria`

Pertenecen a un caso concreto y se definen una vez por caso en la tabla `cases`.

| Campo | Tipo | Qué define |
|---|---|---|
| `vitals_key` | objeto | Respiración, presión y pulso esperados |
| `correct_cuff` | texto | Brazalete que corresponde al paciente |
| `requested_study` | texto | Estudio de rayos X que pide la solicitud |
| `scene3_phrases` | array | Frases de la escena 3 y cuáles no están respaldadas |

Separarlos importa: los globales son criterios del estudio, los por caso son datos del
material clínico. Un caso nuevo agrega una fila, no edita cuatro mapas.

### 5.3 Aprobación

Ambos conjuntos son provisionales y quedan con `approved = false` hasta que la psicóloga los
confirme. Mientras no estén aprobados, el dashboard muestra un aviso para que nadie confunda
un número de arranque con un criterio validado.

Un caso puede registrarse incompleto, sin todos sus criterios. Cuando falta uno, el motor
devuelve `not_evaluable` en los indicadores que lo necesiten y el dashboard avisa qué caso
está incompleto y qué le falta. No inventa un valor por defecto: un default silencioso produce
métricas falsas que nadie nota.

## 6. Recálculo

`metric_results` es derivado y descartable.

- Cambiar un parámetro no toca ninguna sesión.
- Un comando recalcula todas las sesiones o una en particular.
- Cada resultado guarda `config_version` para saber bajo qué criterio se calculó.

Así se puede corregir un criterio al final del estudio y recalcular el histórico entero.

## 7. Estado de sesión

| Estado | Cuándo | Métricas |
|---|---|---|
| `complete` | Las tres escenas en `scenes_completed` | Todas evaluables |
| `incomplete` | Faltan escenas | Solo los indicadores con eventos suficientes |

Una sesión incompleta es un dato válido. El dashboard la muestra marcada.
