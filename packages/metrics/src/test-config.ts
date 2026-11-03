/**
 * Test copy of the seeded study config. Kept local so metric tests do not
 * depend on the database package.
 */
export const STUDY_CONFIG: Record<string, unknown> = {
  min_gaze_ms: 3000,
  valid_pulse_sources: ['wrist', 'monitor'],
  valid_breathing_sources: ['chest', 'monitor'],
  cuff_by_case: { 'case-01-chest-pain': 'adult' },
  bp_required_checks: ['drawer', 'cuff'],
  requested_study_by_case: { 'case-01-chest-pain': 'chest_pa' },
  scene3_phrases: {
    'case-01-chest-pain': [
      { id: 1, text: 'La imagen no muestra alteraciones agudas.', supported: true },
      { id: 2, text: 'El estudio confirma el diagnóstico definitivo.', supported: false },
      { id: 3, text: 'El informe es preliminar.', supported: true },
    ],
  },
  vitals_key_by_case: {
    'case-01-chest-pain': { respiratory_rate: 18, blood_pressure: '120/80', pulse: 76 },
  },
};
