/**
 * Seed data for a fresh database.
 *
 * Two things live here, and they are different in nature:
 *
 * - `STUDY_CONFIG_SEED`: params that apply to every session, whatever the case.
 * - `CASE_SEED`: the case catalog, with the expected values each case compares
 *   against.
 *
 * Both ship unapproved. `study_config.approved` and `cases.approved` are what
 * stop a provisional value from being read as a clinical criterion.
 */

export interface StudyConfigSeed {
  key: string;
  value: unknown;
  description: string;
}

export interface CaseSeed {
  id: string;
  label: string;
  /** Missing pieces are left out on purpose and surface in the dashboard. */
  criteria: Record<string, unknown> | null;
}

/** Params that apply to every session, regardless of case. */
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
    key: 'bp_required_checks',
    value: ['drawer', 'cuff'],
    description: 'Comprobaciones exigidas antes de medir la presión arterial.',
  },
];

/**
 * The case catalog.
 *
 * `case-02-hypertension` ships without `scene3_phrases` on purpose: its clinical
 * values are not defined yet, and the dashboard reports the gap instead of
 * producing `not_evaluable` metrics silently for a whole scene.
 */
export const CASE_SEED: readonly CaseSeed[] = [
  {
    id: 'case-01-chest-pain',
    label: 'Dolor torácico',
    criteria: {
      vitals_key: { respiratory_rate: 18, blood_pressure: '120/80', pulse: 76 },
      correct_cuff: 'adult',
      requested_study: 'chest_pa',
      scene3_phrases: [
        { id: 1, text: 'La imagen no muestra alteraciones agudas.', supported: true },
        { id: 2, text: 'El estudio confirma el diagnóstico definitivo.', supported: false },
        { id: 3, text: 'El informe es preliminar.', supported: true },
      ],
    },
  },
  {
    id: 'case-02-hypertension',
    label: 'Hipertensión',
    criteria: {
      vitals_key: { respiratory_rate: 20, blood_pressure: '150/95', pulse: 88 },
      correct_cuff: 'large_adult',
      requested_study: 'chest_lateral',
    },
  },
];
