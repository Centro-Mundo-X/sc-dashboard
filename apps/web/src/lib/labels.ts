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
    lobby: 'Lobby',
    vital_signs: 'Signos vitales',
    x_ray: 'Rayos X',
    results_delivery: 'Entrega de resultados',
    report: 'Reporte',
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

export function indicatorLabel(id: string): string {
  return (labels.indicator as Record<string, string>)[id] ?? id;
}

export function metricLabel(name: string): string {
  return (labels.metric as Record<string, string>)[name] ?? name;
}
