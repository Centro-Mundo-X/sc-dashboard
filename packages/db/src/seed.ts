/**
 * Provisional values for `study_config`.
 *
 * These exist so the dashboard can show real output before the psychologist
 * reviews the criteria. They ship with `approved: false` and the UI must say so.
 * Nothing here is a clinical decision: `docs/METRICS.md` lists where each one
 * comes from in the source material.
 */

export interface StudyConfigSeed {
  key: string;
  value: unknown;
  description: string;
}

export const STUDY_CONFIG_SEED: readonly StudyConfigSeed[] = [
  {
    key: 'min_gaze_ms',
    value: 3000,
    description: 'Tiempo mínimo de mirada al tórax que cuenta como observación completada.',
  },
  {
    key: 'valid_pulse_sources',
    value: ['wrist', 'monitor'],
    description: 'Vías válidas para tomar el pulso.',
  },
  {
    key: 'valid_breathing_sources',
    value: ['chest', 'monitor'],
    description: 'Vías válidas para observar la respiración.',
  },
  {
    key: 'cuff_by_case',
    value: { 'case-01-chest-pain': 'adult', 'case-02-hypertension': 'large_adult' },
    description: 'Brazalete correcto por caso.',
  },
  {
    key: 'bp_required_checks',
    value: ['rest_five_minutes', 'select_correct_cuff', 'place_on_bare_arm', 'arm_at_heart_level'],
    description: 'Comprobaciones exigidas antes de medir la presión arterial.',
  },
  {
    key: 'requested_study_by_case',
    value: { 'case-01-chest-pain': 'chest_pa', 'case-02-hypertension': 'chest_lateral' },
    description: 'Estudio de rayos X solicitado por caso.',
  },
  {
    key: 'scene3_phrases',
    value: {
      'case-01-chest-pain': [
        { id: 1, text: 'La imagen no muestra alteraciones agudas.', supported: true },
        { id: 2, text: 'El estudio confirma el diagnóstico definitivo.', supported: false },
        { id: 3, text: 'El informe es preliminar.', supported: true },
      ],
    },
    description: 'Frases de la escena 3 y cuáles están respaldadas por el informe.',
  },
  {
    key: 'vitals_key_by_case',
    value: {
      'case-01-chest-pain': { respiratory_rate: 18, blood_pressure: '120/80', pulse: 76 },
      'case-02-hypertension': { respiratory_rate: 20, blood_pressure: '150/95', pulse: 88 },
    },
    description: 'Respiración, presión y pulso esperados por caso.',
  },
];
