# Métricas: qué mide cada una y contra qué compara

Documento para revisar con el equipo clínico. No es una guía técnica.

Las treinta y nueve métricas de este documento son **exactamente** las de los tres cuadros de
`Metricas de TESIS ASETARO.pdf`: trece indicadores, tres métricas por indicador. No se agregó
ninguna métrica propia. Cuando este documento y el cuadro original no coinciden, el cuadro
manda.

Cada métrica se explica en tres partes:

1. **Qué pregunta responde** — en lenguaje llano.
2. **De dónde sale el dato** — qué acción del participante se observa.
3. **Contra qué se compara** — el valor de referencia. Cuando ese valor es un parámetro
   configurable, se indica su valor actual y si está aprobado.

> **Dónde viven los valores de referencia.** Se dividen en dos lugares:
>
> - **`study_config`** — cuatro parámetros que aplican a *toda* sesión, sin importar el caso:
>   `min_gaze_ms`, `valid_pulse_sources`, `valid_breathing_sources`, `bp_required_checks`.
> - **`cases.criteria`** — los valores que pertenecen a *un caso concreto*: sus signos
>   esperados, su brazalete, su estudio de rayos X y sus frases de la escena 3.
>
> Ambos están marcados como **no aprobados**. El dashboard muestra un aviso por cada uno.
> Ninguno de esos valores fue definido por el equipo clínico.
>
> Un caso puede registrarse sin todos sus criterios. Cuando falta uno, las métricas que lo
> necesitan quedan sin evaluar y el dashboard avisa qué caso está incompleto, en lugar de
> producir números vacíos sin explicación.

---

## Escena 1 · Signos vitales

### `breathing` — Respiración

**Observación completada** — `observation_completed`
- *Pregunta*: ¿El participante observó la respiración del paciente?
- *Dato*: el evento `gaze_chest`, que trae `gaze_duration_ms` (cuánto duró la mirada al tórax);
  o el evento `monitor_checked`, si consultó el monitor.
- *Compara contra*: `min_gaze_ms` = **3000 ms** (3 segundos). Si la mirada duró al menos eso,
  o si consultó el monitor, cuenta como completada.
- *Aprobado*: ❌ el umbral y la validez del monitor son provisionales.

**Coincide con la clave** (nombre técnico: `matches_key`)
- *Pregunta*: ¿La frecuencia respiratoria que registró es la correcta para este caso?
- *Dato*: el valor del evento `value_recorded` con `object: "field_rr"`.
- *Compara contra*: `cases.criteria.vitals_key.respiratory_rate` del caso `case-01-chest-pain` = **18**.
- *Aprobado*: ❌ el valor 18 lo puso el equipo de desarrollo como ejemplo.

**Tiempo hasta el registro** — `time_to_record_ms`
- *Pregunta*: ¿Cuánto tardó desde que observó hasta que anotó el número?
- *Dato*: diferencia entre el primer evento de observación (`gaze_chest` o `monitor_checked`)
  y `value_recorded`.
- *Compara contra*: nada. Se reporta el tiempo medido.
- *Aprobado*: ✅ no requiere criterio clínico.

---

### `blood_pressure` — Toma de presión arterial

**Comprobaciones completadas**
- *Pregunta*: ¿Hizo los pasos — `checks_completed_ratio` previos antes de medir la presión?
- *Dato*: los eventos `drawer_opened` (abrió la gaveta) y `cuff_selected` (eligió un brazalete).
- *Compara contra*: `bp_required_checks`, que hoy lista **4 pasos**:
  `rest_five_minutes`, `select_correct_cuff`, `place_on_bare_arm`, `arm_at_heart_level`.
- *Aprobado*: ❌ **dos problemas**. Los 4 pasos los inventó el equipo de desarrollo, y de ellos
  solo dos son observables con los eventos que registra el visor. La métrica hoy divide
  acciones hechas sobre una lista que no se corresponde con lo que se mide. **Necesita
  definición clínica y revisión técnica.**

**Brazalete correcto** — `cuff_matches`
- *Pregunta*: ¿Eligió el brazalete que corresponde?
- *Dato*: el valor de `cuff_selected` (`small`, `adult` o `large_adult`).
- *Compara contra*: `cases.criteria.correct_cuff` del caso `case-01-chest-pain` = **`adult`**.
- *Aprobado*: ❌ el brazalete correcto por caso no está definido por el equipo clínico.

---

### `blood_pressure` — Toma de presión arterial (cont.)

**Lectura registrada** — `reading_recorded`
- *Pregunta*: ¿Anotó algún valor de presión arterial?
- *Dato*: existe un evento `value_recorded` con `object: "field_bp"`.
- *Compara contra*: nada, solo presencia.
- *Aprobado*: ✅

**Lectura coincide con la ficha** — `reading_matches_chart`
- *Pregunta*: ¿El número que anotó es el mismo que mostraba el tensiómetro?
- *Dato*: valor de `value_recorded` (`field_bp`) contra valor de `reading_displayed`.
- *Compara contra*: lo que el propio tensiómetro mostró en la sesión. No hay valor externo.
- *Aprobado*: ✅

---

### `pulse` — Pulso

**Revisión realizada**
- *Pregunta*: ¿Revisó el pulso — `review_performed` del paciente?
- *Dato*: evento `wrist_touched` (tomó la muñeca) o `monitor_checked` (consultó el monitor).
- *Compara contra*: `valid_pulse_sources` = **`["wrist", "monitor"]`**, es decir ambas vías
  cuentan como válidas.
- *Aprobado*: ❌ que las dos vías sean válidas no está definido clínicamente.

**Coincide con lo mostrado** — `matches_displayed`
- *Pregunta*: ¿El pulso anotado es el que mostraba el monitor?
- *Dato*: `value_recorded` (`field_pulse`) contra el valor de `monitor_checked`.
- *Compara contra*: lo que el monitor mostró en la sesión.
- *Aprobado*: ✅

**Corrección antes de confirmar** — `corrected_before_confirm`
- *Pregunta*: ¿Corrigió el valor antes de confirmarlo?
- *Dato*: algún evento del procedimiento con `outcome: "corrected"`.
- *Compara contra*: nada. Se reporta si hubo corrección.
- *Aprobado*: ✅ La especificación RV dice que corregir es conducta válida.

---

### `vitals_integration` — Integración de signos

**Signos correctos de tres** — `correct_vitals_of_three`
- *Pregunta*: De los tres signos, ¿cuántos coinciden con los esperados?
- *Dato*: los tres `value_recorded` de la ficha (`field_rr`, `field_bp`, `field_pulse`).
- *Compara contra*: `cases.criteria.vitals_key` del caso `case-01-chest-pain` =
  **FR 18 · PA `120/80` · pulso 76**.
- *Aprobado*: ❌ los tres valores son de ejemplo.

**Campos omitidos** — `omitted_fields`
- *Pregunta*: ¿Cuántos campos de la ficha quedaron vacíos?
- *Dato*: cuáles de los tres campos no tienen `value_recorded`.
- *Compara contra*: la lista fija de tres campos.
- *Aprobado*: ✅

**Discordancias con la ficha** — `chart_discrepancies`
- *Pregunta*: ¿Cuántos valores anotados difieren de los esperados?
- *Dato*: los tres valores registrados.
- *Compara contra*: el mismo `cases.criteria.vitals_key` del caso.
- *Aprobado*: ❌ depende de los valores de ejemplo.

---

## Escena 2 · Rayos X

### `identity_verification` — Verificación de identidad

**Comprobaciones completadas**
- *Pregunta*: ¿Verificó quién — `checks_completed_ratio` era el paciente antes de tomar la imagen?
- *Dato*: tres eventos: `console_opened`, `wristband_read`, `identification_dialogue`.
- *Compara contra*: esas tres acciones como total. **El total está fijo en el código, no en
  configuración.**
- *Aprobado*: ❌ que sean exactamente esas tres comprobaciones lo decidió el equipo de
  desarrollo a partir de la especificación RV.

**Estudio coincide con lo solicitado** — `study_matches_request`
- *Pregunta*: ¿Eligió el estudio que la solicitud pedía?
- *Dato*: el valor de `study_selected`.
- *Compara contra*: `cases.criteria.requested_study` del caso `case-01-chest-pain` = **`chest_pa`**.
- *Aprobado*: ❌ el estudio solicitado por caso no está definido clínicamente.

**Activaciones antes de verificar** — `activations_before_check`
- *Pregunta*: ¿Disparó la captura antes de terminar de verificar la identidad?
- *Dato*: marca de tiempo de `capture_activated` contra la del último evento de verificación.
- *Compara contra*: el orden temporal de los dos eventos.
- *Aprobado*: ⚠️ la idea viene del cuadro de métricas ("M3 Activaciones antes de completar la
  verificación"), pero la forma de calcularla la definió el equipo de desarrollo.

---

### `patient_preparation` — Preparación del paciente

**Instrucciones comunicadas** — `instructions_ratio`
- *Pregunta*: ¿Le dio al paciente las indicaciones necesarias?
- *Dato*: eventos `phrase_communicated`, contando los que no están `omitted`.
- *Compara contra*: el total de frases que aparecieron en la escena.
- *Aprobado*: ⚠️ el total sale de las frases que Unity emitió, no de una lista clínica. Si Unity
  muestra 3 frases, el denominador es 3.

**Paciente confirmó** — `patient_confirmed`
- *Pregunta*: ¿El paciente confirmó que entendió y estaba listo?
- *Dato*: evento `patient_confirmed` con resultado `completed`.
- *Compara contra*: nada, solo presencia.
- *Aprobado*: ✅

**Captura antes de preparar** — `capture_before_prep`
- *Pregunta*: ¿Disparó la captura antes de que el paciente confirmara?
- *Dato*: marca de tiempo de `capture_activated` contra `patient_confirmed`.
- *Compara contra*: el orden temporal.
- *Aprobado*: ⚠️ inferencia del equipo de desarrollo desde el cuadro de métricas.

---

### `acquisition_activation` — Activación de la adquisición

**Activación con requisitos completos** — `activated_with_requirements`
- *Pregunta*: ¿Disparó la adquisición con todo lo previo resuelto?
- *Dato*: marca de tiempo de `capture_activated` frente a `requirements_completed`.
- *Compara contra*: el orden temporal de los dos eventos.
- *Aprobado*: ✅ el cuadro lo pide tal cual.

**Intentos de activación prematura** — `premature_attempts`
- *Pregunta*: ¿Cuántas veces intentó disparar sin cumplir los requisitos?
- *Dato*: eventos `capture_rejected`, que el escenario emite cuando rechaza un intento.
- *Compara contra*: nada, se cuentan.
- *Aprobado*: ✅

**Tiempo desde requisitos completos hasta activación** — `time_from_requirements_ms`
- *Pregunta*: ¿Cuánto tardó en disparar una vez que pudo?
- *Dato*: diferencia entre `requirements_completed` y `capture_activated`.
- *Compara contra*: nada, se reporta el tiempo.
- *Aprobado*: ✅

---

### `image_review` — Revisión de la imagen obtenida

**Revisión de imagen realizada** — `review_performed`
- *Pregunta*: ¿Revisó la imagen y tomó una decisión?
- *Dato*: `image_accepted` o `image_rejected`, cualquiera de los dos con resultado `completed`.
- *Compara contra*: nada, solo presencia.
- *Aprobado*: ✅

**Decisión concordante con la clave de calidad técnica** — `decision_matches_quality_key`
- *Pregunta*: ¿Aceptó o rechazó la imagen como correspondía?
- *Dato*: si hubo `image_rejected` o `image_accepted`.
- *Compara contra*: el campo `programmed_defect` del evento `image_displayed`. Si la imagen
  tenía defecto, lo correcto era rechazarla; si estaba limpia, aceptarla.
- *Aprobado*: ⚠️ el cálculo sigue el cuadro, pero **la clave de calidad la define el caso**.
  Hoy el defecto se marca en el evento que envía Unity, no en `cases.criteria`.

**Repeticiones justificadas / repeticiones realizadas** — `justified_repeats_ratio`
- *Pregunta*: De las veces que pidió repetir, ¿cuántas estaban justificadas?
- *Dato*: eventos `image_repeat_requested`.
- *Compara contra*: si la imagen tenía defecto. Una repetición es justificada cuando la imagen
  tenía el defecto programado.
- *Aprobado*: ⚠️ si no pidió repetir, la métrica queda sin evaluar: no hay nada que juzgar.

---

### `correspondence` — Correspondencia

**Identificadores comprobados** — `identifiers_ratio`
- *Pregunta*: ¿Comprobó que ficha, imagen e informe pertenecen al mismo paciente?
- *Dato*: `panel_opened` y `identifiers_compared`.
- *Compara contra*: esas dos acciones como total, fijo en el código.
- *Aprobado*: ⚠️ el conjunto de comprobaciones lo definió el equipo de desarrollo.

**Informe correcto** — `report_correct`
- *Pregunta*: ¿El informe que abrió corresponde al paciente y estudio?
- *Dato*: el campo `matches` del evento `identifiers_compared`.
- *Compara contra*: ese mismo campo, que envía Unity.
- *Aprobado*: ⚠️ el backend confía en lo que Unity informa. No verifica nada por su cuenta.

**Comunicaciones antes de verificar** — `communications_before_check`
- *Pregunta*: ¿Le habló al paciente antes de comprobar los identificadores?
- *Dato*: el primer `verbal_response` contra el último evento de verificación.
- *Compara contra*: el orden temporal.
- *Aprobado*: ⚠️ inferencia del equipo de desarrollo.

---

### `text_validation` — Validación del texto

**Frases clasificadas** — `phrases_classified_ratio`
- *Pregunta*: ¿Clasificó las frases que le presentaron?
- *Dato*: eventos `phrase_classified`.
- *Compara contra*: **3 frases**, tomadas de `cases.criteria.scene3_phrases` del caso.
- *Aprobado*: ❌ las frases las inventó el equipo de desarrollo. Están en la configuración y se
  pueden cambiar, pero no son las frases reales del estudio.

**No respaldadas aceptadas** — `unsupported_accepted`
- *Pregunta*: ¿Aceptó como verdadera alguna frase que el informe no respalda?
- *Dato*: los `phrase_classified` con valor `supported`.
- *Compara contra*: las frases marcadas `supported: false` en `cases.criteria.scene3_phrases`. Hoy es **una
  sola**: *"El estudio confirma el diagnóstico definitivo."*
- *Aprobado*: ❌ qué frases son falsas lo define el material del caso, que hoy es de ejemplo.

**Correcciones antes de comunicar** — `corrections_before_communicating`
- *Pregunta*: ¿Corrigió algo antes de hablar con el paciente?
- *Dato*: algún evento con `outcome: "corrected"`.
- *Compara contra*: nada, solo presencia.
- *Aprobado*: ✅

---

### `inconclusive` — Resultado no concluyente

**Estado reconocido** — `status_recognized`
- *Pregunta*: ¿Identificó si el informe era definitivo o preliminar?
- *Dato*: evento `report_status_recognized` y su valor.
- *Compara contra*: nada. Registra si el evento ocurrió y con qué valor.
- *Aprobado*: ⚠️ no está claro qué significa "reconocer" en términos observables. El cálculo
  actual solo comprueba que el valor no esté vacío, lo cual es débil.

**Comunicaciones improcedentes** — `improper_final_communications`
- *Pregunta*: ¿Comunicó una conclusión definitiva cuando el informe era preliminar?
- *Dato*: `verbal_response` con valor `definitive_conclusion`, cuando el estado era `preliminary`.
- *Compara contra*: el valor de `report_status_recognized`.
- *Aprobado*: ❌ el valor `definitive_conclusion` es una convención que inventó el equipo de
  desarrollo. Unity tiene que emitirlo para que la métrica funcione.

**Solicitudes de aclaración** — `clarification_requests`
- *Pregunta*: ¿Cuántas veces pidió una aclaración?
- *Dato*: eventos `clarification_requested`.
- *Compara contra*: nada, se cuenta.
- *Aprobado*: ⚠️ `clarification_requested` no está en el catálogo de acciones del contrato.
  Hace falta agregarla.

---

### `explanation` — Explicación

**Mensajes concordantes** — `messages_concordant_ratio`
- *Pregunta*: ¿Lo que le dijo al paciente está respaldado por el informe?
- *Dato*: los `verbal_response` y su `phrase_id`.
- *Compara contra*: las frases marcadas `supported: true` en `cases.criteria.scene3_phrases` — hoy **dos** de
  tres.
- *Aprobado*: ❌ depende de las frases de ejemplo.

**Afirmaciones no respaldadas** — `unsupported_claims`
- *Pregunta*: ¿Cuántas cosas dijo que el informe no respalda?
- *Dato*: los `verbal_response` cuyo `phrase_id` no está entre las respaldadas.
- *Compara contra*: la misma lista de frases.
- *Aprobado*: ❌ misma dependencia.

**Información relevante omitida** — `relevant_info_omitted`
- *Pregunta*: ¿Dejó de mencionar algo importante?
- *Dato*: eventos de este procedimiento con `outcome: "omitted"`.
- *Compara contra*: nada. Se cuentan las omisiones registradas.
- *Aprobado*: ⚠️ aproximación: una omisión solo cuenta si Unity la registra como tal.

---

### `comprehension` — Comprensión

**Comprobación realizada** — `check_performed`
- *Pregunta*: ¿Le preguntó al paciente qué había entendido?
- *Dato*: evento `comprehension_asked` con resultado `completed`.
- *Compara contra*: nada, solo presencia.
- *Aprobado*: ✅

**Malentendidos aclarados** — `misunderstandings_resolved`
- *Pregunta*: Si hubo un malentendido, ¿lo aclaró?
- *Dato*: el campo `misunderstanding_detected` de `comprehension_asked`, y si hubo
  `clarification_requested` o `corrected` después.
- *Compara contra*: ese campo, que envía Unity.
- *Aprobado*: ⚠️ qué cuenta como "aclarar" lo definió el equipo de desarrollo.

**Instrucciones comprendidas** — `instructions_understood_ratio`
- *Pregunta*: ¿El paciente entendió las indicaciones?
- *Dato*: eventos `phrase_communicated` que no están `omitted`.
- *Compara contra*: el total de frases comunicadas.
- *Aprobado*: ⚠️ aproximación: no mide comprensión, mide que la instrucción se haya dado.

---

## Resumen

| Confianza | Cantidad | Cuáles |
|---|---|---|
| ✅ No requiere criterio clínico | 13 | tiempos, conteos de presencia, coincidencias contra lo que mostró el propio equipo en pantalla |
| ⚠️ Inferencia del equipo de desarrollo | 13 | orden temporal de acciones, aproximaciones |
| ❌ Depende de valores sin aprobar | 13 | todo lo que compara contra los criterios de un caso o contra `bp_required_checks` |

Las 39 métricas están implementadas. Ninguna sobra y ninguna falta respecto al cuadro de
origen.

## Lo que necesita decisión clínica

### Parámetros globales, en `study_config`

1. **`min_gaze_ms`** — cuánto tiempo mirando el tórax cuenta como observación. Hoy 3 segundos.
2. **`valid_pulse_sources`** y **`valid_breathing_sources`** — si el monitor es una vía válida.
3. **`bp_required_checks`** — cuáles son los pasos obligatorios antes de medir la presión.

### Valores por caso, en `cases.criteria`

4. **`vitals_key`** — qué respiración, presión y pulso son correctos para cada caso.
5. **`correct_cuff`** — qué brazalete corresponde a cada caso.
6. **`requested_study`** — qué estudio se pide en cada caso.
7. **`scene3_phrases`** — las frases reales de la escena 3 y cuáles no están respaldadas.

**El caso `case-02-hypertension` está registrado sin `scene3_phrases`.** Sus métricas de la
escena 3 quedan sin evaluar hasta que se definan, y el dashboard lo muestra como caso
incompleto.

### Decisiones que el cuadro deja abiertas

8. **Clave de calidad técnica de la imagen** — el cuadro 2 pide "decisión concordante con la
   clave de calidad técnica" y "repeticiones justificadas", pero no dice cuál es esa clave
   para cada caso. Hoy se apoya en el campo `programmed_defect` que envía Unity. Si el defecto
   debe definirse por caso, tiene que vivir en `cases.criteria`.

## Lo que necesita corrección técnica

Tres cosas que el motor pide y el contrato todavía no garantiza:

1. **`bp_required_checks` cuenta dos comprobaciones.** El motor mapea cada paso de la
   configuración a una acción concreta: `drawer` a `drawer_opened` y `cuff` a `cuff_selected`.
   Si la configuración lista pasos con otros nombres, no se cuentan. La lista de configuración
   y el mapeo del motor tienen que coincidir.
2. **Eventos nuevos que Unity debe emitir.** La versión anterior del motor no los necesitaba
   porque se había inventado métricas más simples. Ahora el cuadro los exige:
   `requirements_completed`, `capture_rejected`, `image_accepted`, `image_rejected`,
   `image_repeat_requested`, `clarification_requested`. Están en `docs/DATA-CONTRACT.md`.
3. **`inconclusive` y `comprehension` leen campos de contexto.** El estado real del informe y
   cuántas instrucciones entendió el paciente vienen en `context` de dos eventos. Unity tiene
   que poblarlos o las métricas quedan sin evaluar.

## Lo que ya está resuelto

- **El caso desconocido se rechaza al ingestar.** Antes un `case_id` con un error de tipeo
  producía una sesión con todas las métricas vacías, sin aviso.
- **Un caso incompleto ya no es silencioso.** La sesión guarda qué versión de criterios vio el
  participante, y el dashboard avisa qué le falta al caso.
- **Los valores por caso dejaron de estar dispersos.** Antes vivían en cuatro mapas dentro de
  `study_config`, donde un caso podía estar en tres y faltar del cuarto sin que nada lo
  señalara.
- **No quedan métricas inventadas.** La versión anterior tenía un indicador completo que el
  cuadro no pedía y dos métricas de imagen que no correspondían. Se reemplazaron por las que
  el cuadro sí define.
