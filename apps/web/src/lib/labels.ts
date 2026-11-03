/**
 * All user-facing strings. The interface is in Spanish; the code stays English.
 */

export const labels = {
  appName: 'Simulación Clínica',
  subtitle: 'Sesiones de realidad virtual',

  login: {
    title: 'Iniciar sesión',
    username: 'Usuario',
    password: 'Contraseña',
    submit: 'Entrar',
    error: 'Credenciales incorrectas',
    logout: 'Salir',
  },

  configWarning: {
    title: 'Valores provisionales',
    body: 'Los criterios clínicos todavía no están aprobados. Las métricas de abajo usan valores de arranque y pueden cambiar.',
    pending: 'Pendientes',
  },

  sessions: {
    title: 'Sesiones',
    empty: 'Todavía no hay sesiones cargadas.',
    participant: 'Participante',
    phase: 'Fase',
    case: 'Caso',
    status: 'Estado',
    started: 'Inicio',
    duration: 'Duración',
    events: 'Eventos',
    invalidEvents: 'Inválidos',
    filterParticipant: 'Filtrar por participante',
    filterStatus: 'Filtrar por estado',
    all: 'Todas',
  },

  status: {
    complete: 'Completa',
    incomplete: 'Incompleta',
  },

  phase: {
    single: 'Única',
    pretest: 'Pretest',
    posttest: 'Postest',
  },

  session: {
    back: 'Volver a sesiones',
    timeline: 'Eventos registrados',
    metrics: 'Métricas',
    incompleteReason: 'Motivo de la sesión incompleta',
    saveReason: 'Guardar motivo',
    noMetrics: 'Sin métricas calculadas.',
    notEvaluable: 'No evaluable',
    evaluatedIndicators: 'Indicadores evaluados',
    saved: 'Guardado',
  },

  timeline: {
    index: '#',
    time: 'Hora',
    scene: 'Escena',
    procedure: 'Procedimiento',
    action: 'Acción',
    outcome: 'Resultado',
  },

  filter: {
    submit: 'Filtrar',
  },

  caseWarning: {
    title: 'está incompleto',
    body: 'Faltan criterios de comparación. Las métricas que los necesitan no se pueden evaluar.',
  },

  footer: {
    provisional: 'Los criterios clínicos de esta versión son provisionales y están pendientes de aprobación.',
  },

  header: {
    context: 'Tesis · Bello Campo',
  },

  scene: {
    vital_signs: 'Signos vitales',
    x_ray: 'Rayos X',
    results_delivery: 'Entrega de resultados',
    outside: 'Fuera de escena',
  },

  sceneDescription: {
    vital_signs: 'Respiración, presión arterial y pulso',
    x_ray: 'Verificación, preparación y captura',
    results_delivery: 'Correspondencia, validación y explicación',
    outside: 'Eventos de sesión',
  },

  indicator: {
    breathing: 'Revisión de la respiración',
    blood_pressure: 'Toma de presión arterial',
    pulse: 'Revisión del pulso',
    vitals_integration: 'Integración de los tres signos',
    identity_verification: 'Verificación previa al examen',
    patient_preparation: 'Preparación del paciente',
    acquisition_activation: 'Activación de la adquisición',
    image_review: 'Revisión de la imagen obtenida',
    correspondence: 'Correspondencia del resultado',
    text_validation: 'Validación del texto del caso',
    explanation: 'Explicación al paciente',
    comprehension: 'Comprobación de comprensión',
    inconclusive: 'Manejo de resultado no concluyente',
  },

  metric: {
    observation_completed: 'Observación completada',
    matches_key: 'Coincide con la clave',
    time_to_record_ms: 'Tiempo hasta el registro',
    checks_completed_ratio: 'Comprobaciones completadas',
    cuff_matches: 'Brazalete correcto',
    reading_recorded: 'Lectura registrada',
    reading_matches_chart: 'Lectura coincide con la ficha',
    review_performed: 'Revisión realizada',
    matches_displayed: 'Coincide con lo mostrado',
    corrected_before_confirm: 'Corrección antes de confirmar',
    correct_vitals_of_three: 'Signos correctos de tres',
    omitted_fields: 'Campos omitidos',
    chart_discrepancies: 'Discordancias con la ficha',
    study_matches_request: 'Estudio coincide con lo solicitado',
    activations_before_check: 'Activaciones antes de verificar',
    instructions_ratio: 'Instrucciones comunicadas',
    patient_confirmed: 'Paciente confirmó',
    capture_before_prep: 'Captura antes de preparar',
    capture_executed: 'Captura ejecutada',
    defect_detected: 'Defecto detectado',
    review_duration_ms: 'Duración de la revisión',
    identifiers_ratio: 'Identificadores comprobados',
    report_correct: 'Informe correcto',
    communications_before_check: 'Comunicaciones antes de verificar',
    phrases_classified_ratio: 'Frases clasificadas',
    unsupported_accepted: 'No respaldadas aceptadas',
    corrections_before_communicating: 'Correcciones antes de comunicar',
    reading_matches_display: 'Lectura registrada frente a la mostrada',
    activated_with_requirements: 'Activación con requisitos completos',
    premature_attempts: 'Intentos de activación prematura',
    time_from_requirements_ms: 'Tiempo desde requisitos hasta activación',
    decision_matches_quality_key: 'Decisión concordante con la calidad técnica',
    justified_repeats_ratio: 'Repeticiones justificadas',
    status_recognized: 'Estado reconocido',
    improper_final_communications: 'Comunicaciones definitivas improcedentes',
    clarification_requests: 'Solicitudes de aclaración',
    messages_concordant_ratio: 'Mensajes concordantes',
    unsupported_claims: 'Afirmaciones no respaldadas',
    relevant_info_omitted: 'Información relevante omitida',
    check_performed: 'Comprobación realizada',
    misunderstandings_resolved: 'Malentendidos aclarados',
    instructions_understood_ratio: 'Instrucciones comprendidas',
  },

  value: {
    yes: 'Sí',
    no: 'No',
    ms: 'ms',
  },
} as const;

/**
 * Which scene each indicator belongs to. Mirrors `INDICATORS` in
 * `packages/metrics/src/engine.ts`; used to group the dashboard by scene.
 */
export const INDICATOR_SCENE: Record<string, keyof typeof labels.scene> = {
  breathing: 'vital_signs',
  blood_pressure: 'vital_signs',
  pulse: 'vital_signs',
  vitals_integration: 'vital_signs',
  identity_verification: 'x_ray',
  patient_preparation: 'x_ray',
  acquisition_activation: 'x_ray',
  image_review: 'x_ray',
  correspondence: 'results_delivery',
  text_validation: 'results_delivery',
  explanation: 'results_delivery',
  comprehension: 'results_delivery',
  inconclusive: 'results_delivery',
};

export function indicatorLabel(id: string): string {
  return (labels.indicator as Record<string, string>)[id] ?? id;
}

export function metricLabel(name: string): string {
  return (labels.metric as Record<string, string>)[name] ?? name;
}

/**
 * One-line explanation per metric, shown on hover.
 *
 * Written for the psychologist reading a session, not for a developer: it says
 * what the number counts, not how it is computed. Kept next to the labels so a
 * new metric cannot be added without a description.
 */
export const metricDescription: Record<string, string> = {
  // Table 1 · Vital signs
  observation_completed:
    'El participante observó la respiración el tiempo mínimo, mirando el tórax o consultando el monitor.',
  matches_key:
    'La frecuencia respiratoria registrada coincide con la del caso.',
  time_to_record_ms:
    'Tiempo entre que se mostró la respiración y el registro del valor.',

  checks_completed_ratio:
    'Proporción de comprobaciones previas completadas sobre las que exige el caso.',
  cuff_matches: 'El brazalete elegido es el que corresponde al paciente.',
  reading_matches_display:
    'El valor de presión registrado coincide con el que mostró el tensiómetro.',

  review_performed:
    'El participante revisó el pulso por alguna de las vías válidas: muñeca o monitor.',
  matches_displayed:
    'El valor de pulso registrado coincide con el que mostró el monitor.',
  corrected_before_confirm:
    'Hubo una corrección del valor antes de confirmarlo. Corregir es conducta válida.',

  correct_vitals_of_three:
    'Cantidad de signos, de los tres, que coinciden con la clave del caso.',
  omitted_fields: 'Campos de la ficha que quedaron sin completar.',
  chart_discrepancies: 'Valores de la ficha final que difieren de la clave del caso.',

  // Table 2 · X-ray
  study_matches_request:
    'El estudio seleccionado coincide con el que la solicitud pedía.',
  activations_before_check:
    'La adquisición se activó antes de terminar la verificación de identidad.',

  instructions_ratio:
    'Proporción de instrucciones al paciente que se comunicaron sobre las previstas.',
  patient_confirmed: 'El paciente confirmó haber entendido y ejecutado la preparación.',
  capture_before_prep:
    'La adquisición se inició antes de que el paciente confirmara la preparación.',

  activated_with_requirements:
    'La adquisición se activó con todos los requisitos previos completados.',
  premature_attempts:
    'Intentos de activar la adquisición sin cumplir los requisitos.',
  time_from_requirements_ms:
    'Tiempo entre completar los requisitos y activar la adquisición.',

  decision_matches_quality_key:
    'La decisión de aceptar o rechazar la imagen coincide con la clave de calidad técnica del caso.',
  justified_repeats_ratio:
    'Proporción de repeticiones solicitadas que estaban justificadas por un defecto real.',

  // Table 3 · Results delivery
  identifiers_ratio:
    'Proporción de identificadores comprobados entre ficha, imagen e informe.',
  report_correct: 'El informe seleccionado corresponde al paciente y al estudio.',
  communications_before_check:
    'Se habló con el paciente antes de verificar los identificadores.',

  phrases_classified_ratio:
    'Proporción de afirmaciones clasificadas correctamente sobre las evaluables.',
  unsupported_accepted:
    'Afirmaciones que el informe no respalda y se aceptaron como respaldadas.',
  corrections_before_communicating:
    'Hubo correcciones antes de comunicar al paciente.',

  messages_concordant_ratio:
    'Proporción de mensajes al paciente que el informe respalda.',
  unsupported_claims:
    'Afirmaciones comunicadas que el informe no respalda.',
  relevant_info_omitted:
    'Elementos relevantes del informe que no se comunicaron.',

  check_performed:
    'Se preguntó al paciente qué había entendido.',
  misunderstandings_resolved:
    'Hubo un malentendido en la respuesta del paciente y se aclaró.',
  instructions_understood_ratio:
    'Proporción de instrucciones que el paciente comprendió sobre las comunicadas.',

  status_recognized:
    'La respuesta del participante sobre el estado del informe coincide con el estado real.',
  improper_final_communications:
    'Comunicaciones que presentan como definitivo un resultado que no lo era.',
  clarification_requests:
    'Veces que se pidió una aclaración en lugar de concluir.',
};

export function descriptionOf(metric: string): string | undefined {
  return metricDescription[metric];
}
