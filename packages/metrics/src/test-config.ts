/**
 * Fixtures for metric tests. Kept local so the engine tests do not depend on
 * the database package.
 *
 * Split in two on purpose: `STUDY_CONFIG` holds params that apply to every case,
 * while `CASE_CRITERIA` holds what belongs to one case.
 */

/** Params that apply to every session regardless of case. */
export const STUDY_CONFIG: Record<string, unknown> = {
  min_gaze_ms: 3000,
  valid_pulse_sources: ['wrist', 'monitor'],
  valid_breathing_sources: ['chest', 'monitor'],
  bp_required_checks: ['drawer', 'cuff'],
};

/** Expected values for `case-01-chest-pain`. */
export const CASE_CRITERIA = {
  vitals_key: { respiratory_rate: 18, blood_pressure: '120/80', pulse: 76 },
  correct_cuff: 'adult',
  requested_study: 'chest_pa',
  scene3_phrases: [
    { id: 1, text: 'La imagen no muestra alteraciones agudas.', supported: true },
    { id: 2, text: 'El estudio confirma el diagnóstico definitivo.', supported: false },
    { id: 3, text: 'El informe es preliminar.', supported: true },
  ],
};
