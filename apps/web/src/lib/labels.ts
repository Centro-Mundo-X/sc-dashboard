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
    breathing: 'Respiración',
    bp_preparation: 'Preparación de la presión',
    bp_measurement: 'Medición de la presión',
    pulse: 'Pulso',
    vitals_integration: 'Integración de signos',
    identity_verification: 'Verificación de identidad',
    patient_preparation: 'Preparación del paciente',
    image_capture: 'Captura de imagen',
    image_review: 'Revisión de imagen',
    correspondence: 'Correspondencia',
    text_validation: 'Validación del texto',
    inconclusive: 'Resultado no concluyente',
    explanation: 'Explicación',
    comprehension: 'Comprensión',
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
  bp_preparation: 'vital_signs',
  bp_measurement: 'vital_signs',
  pulse: 'vital_signs',
  vitals_integration: 'vital_signs',
  identity_verification: 'x_ray',
  patient_preparation: 'x_ray',
  image_capture: 'x_ray',
  image_review: 'x_ray',
  correspondence: 'results_delivery',
  text_validation: 'results_delivery',
  inconclusive: 'results_delivery',
  explanation: 'results_delivery',
  comprehension: 'results_delivery',
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
  // respiration
  observation_completed:
    'El participante observó la respiración el tiempo mínimo, ya sea mirando el tórax o consultando el monitor.',
  matches_key:
    'La frecuencia respiratoria registrada coincide con la del caso.',
  time_to_record_ms:
    'Tiempo entre la primera observación de la respiración y el registro del valor.',

  // blood pressure
  checks_completed_ratio:
    'Proporción de comprobaciones previas completadas sobre las que exige el caso.',
  cuff_matches: 'El brazalete elegido es el que corresponde al caso.',
  reading_recorded: 'Se registró un valor de presión arterial en la ficha.',
  reading_matches_chart:
    'El valor registrado coincide con el que mostró el tensiómetro.',

  // pulse
  review_performed:
    'El participante revisó el pulso por alguna de las vías válidas: muñeca o monitor.',
  matches_displayed:
    'El valor registrado coincide con el que mostró el monitor.',
  corrected_before_confirm:
    'Hubo una corrección del valor antes de confirmarlo. Corregir es conducta válida.',

  // vitals integration
  correct_vitals_of_three:
    'Cantidad de signos, de los tres, que coinciden con la clave del caso.',
  omitted_fields: 'Campos de la ficha que quedaron sin completar.',
  chart_discrepancies: 'Valores de la ficha que difieren de la clave del caso.',

  // x-ray
  study_matches_request:
    'El estudio seleccionado coincide con el que la solicitud pedía.',
  activations_before_check:
    'La captura se activó antes de terminar la verificación de identidad.',
  instructions_ratio:
    'Proporción de instrucciones al paciente que se comunicaron sobre las previstas.',
  patient_confirmed: 'El paciente confirmó haber entendido y ejecutado la preparación.',
  capture_before_prep:
    'La captura se activó antes de que el paciente confirmara la preparación.',
  capture_executed: 'Se activó la captura de la imagen.',
  defect_detected: 'La imagen mostrada tenía un defecto técnico programado.',
  review_duration_ms: 'Tiempo entre que se mostró la imagen y se dio por revisada.',

  // results delivery
  identifiers_ratio:
    'Proporción de identificadores comprobados entre ficha, imagen e informe.',
  report_correct: 'El informe abierto corresponde al paciente y al estudio.',
  communications_before_check:
    'Se habló con el paciente antes de verificar los identificadores.',
  phrases_classified_ratio:
    'Proporción de frases clasificadas sobre las que había que clasificar.',
  unsupported_accepted:
    'Frases que el informe no respalda y se aceptaron como respaldadas.',
  corrections_before_communicating:
    'Hubo correcciones antes de comunicar al paciente.',
  status_recognized:
    'Se reconoció si el informe era definitivo o preliminar.',
  improper_final_communications:
    'Se comunicó una conclusión definitiva cuando el informe era preliminar.',
  clarification_requests:
    'Veces que se pidió una aclaración en lugar de concluir.',
  messages_concordant_ratio:
    'Proporción de mensajes al paciente respaldados por el informe.',
  unsupported_claims:
    'Afirmaciones comunicadas que el informe no respalda.',
  relevant_info_omitted:
    'Elementos relevantes del informe que no se comunicaron.',
  check_performed:
    'Se preguntó al paciente qué había entendido.',
  misunderstandings_resolved:
    'Hubo un malentendido y se aclaró antes de cerrar.',
  instructions_understood_ratio:
    'Proporción de instrucciones que el paciente comprendió.',
};

export function descriptionOf(metric: string): string | undefined {
  return metricDescription[metric];
}
