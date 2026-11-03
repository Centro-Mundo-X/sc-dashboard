# Métricas

Fuente: los cuadros de métricas de la tesis y la ruta de jugabilidad de las escenas de RV.

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

Los trece indicadores de los cuadros de métricas de la tesis, con sus treinta y nueve
métricas. Cada fila corresponde a una fila del cuadro de origen.

**Si un indicador o una métrica no está en esos cuadros, no se calcula.** No se agregan
métricas propias: el motor implementa lo que la tesis definió, nada más.

### Cuadro 1 · Escena: toma de signos vitales

| Indicador | `procedure` | M1 | M2 | M3 |
|---|---|---|---|---|
| `breathing` | `breathing` | Observación completada: sí/no | Concordancia del registro con la clave del caso | Tiempo entre mostrar la respiración y registrar el dato |
| `blood_pressure` | `blood_pressure` | Comprobaciones completadas / aplicables | Selección del brazalete concordante: sí/no | Lectura registrada frente a lectura mostrada |
| `pulse` | `pulse` | Revisión realizada: sí/no | Concordancia entre valor mostrado y registrado | Corrección del valor antes de confirmar: sí/no |
| `vitals_integration` | `vitals_integration` | Signos correctamente registrados / tres signos previstos | Campos omitidos | Discordancias entre lecturas y ficha final |

### Cuadro 2 · Escena: toma de rayos X

| Indicador | `procedure` | M1 | M2 | M3 |
|---|---|---|---|---|
| `identity_verification` | `identity_verification` | Comprobaciones realizadas / aplicables | Estudio seleccionado frente al solicitado | Activaciones antes de completar la verificación |
| `patient_preparation` | `patient_preparation` | Instrucciones pertinentes comunicadas / previstas | Confirmación del paciente: sí/no | Inicio de adquisición antes de completar la preparación |
| `acquisition_activation` | `image_capture` | Activación con requisitos completos: sí/no | Intentos de activación prematura | Tiempo desde requisitos completos hasta activación |
| `image_review` | `image_review` | Revisión de imagen realizada: sí/no | Decisión concordante con la clave de calidad técnica | Repeticiones justificadas / repeticiones realizadas |

### Cuadro 3 · Escena: entrega y validación de resultados

| Indicador | `procedure` | M1 | M2 | M3 |
|---|---|---|---|---|
| `correspondence` | `correspondence` | Identificadores comprobados / aplicables | Selección del informe correcto: sí/no | Comunicaciones iniciadas antes de verificar |
| `text_validation` | `text_validation` | Afirmaciones clasificadas correctamente / evaluables | Afirmaciones no respaldadas aceptadas | Correcciones realizadas antes de comunicar |
| `explanation` | `explanation` | Mensajes concordantes / mensajes evaluables | Afirmaciones no respaldadas comunicadas | Información relevante omitida según la rúbrica |
| `comprehension` | `comprehension` | Comprobación realizada: sí/no | Malentendidos detectados y aclarados | Instrucciones comprendidas en la respuesta del paciente / instrucciones comunicadas |
| `inconclusive` | `inconclusive` | Reconocimiento del estado del informe: sí/no | Comunicaciones definitivas improcedentes | Solicitudes de aclaración cuando correspondía |

### Nombres en el código

| Indicador | M1 | M2 | M3 |
|---|---|---|---|
| `breathing` | `observation_completed` | `matches_key` | `time_to_record_ms` |
| `blood_pressure` | `checks_completed_ratio` | `cuff_matches` | `reading_matches_display` |
| `pulse` | `review_performed` | `matches_displayed` | `corrected_before_confirm` |
| `vitals_integration` | `correct_vitals_of_three` | `omitted_fields` | `chart_discrepancies` |
| `identity_verification` | `checks_completed_ratio` | `study_matches_request` | `activations_before_check` |
| `patient_preparation` | `instructions_ratio` | `patient_confirmed` | `capture_before_prep` |
| `acquisition_activation` | `activated_with_requirements` | `premature_attempts` | `time_from_requirements_ms` |
| `image_review` | `review_performed` | `decision_matches_quality_key` | `justified_repeats_ratio` |
| `correspondence` | `identifiers_ratio` | `report_correct` | `communications_before_check` |
| `text_validation` | `phrases_classified_ratio` | `unsupported_accepted` | `corrections_before_communicating` |
| `explanation` | `messages_concordant_ratio` | `unsupported_claims` | `relevant_info_omitted` |
| `comprehension` | `check_performed` | `misunderstandings_resolved` | `instructions_understood_ratio` |
| `inconclusive` | `status_recognized` | `improper_final_communications` | `clarification_requests` |

### Datos que no son métricas

Algunas cosas que el visor registra se muestran en el timeline pero no se cuentan como
métricas, porque el cuadro de origen no las pide:

- Duración de cada escena, calculada desde `scene_started` y `scene_ended`.
- Duración total de la sesión.
- Si la imagen que se mostró tenía el defecto técnico programado.

Sirven de contexto para leer los resultados, no como medida de desempeño.

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
