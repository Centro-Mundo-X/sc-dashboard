import type { events, metricResults } from '@sc/db';

/** One row of the stored metric results, as the dashboard reads it. */
export type MetricRow = typeof metricResults.$inferSelect;

/** One row of the stored timeline events. */
export type SessionEventRow = typeof events.$inferSelect;

/**
 * The three clinical scenes plus `outside`, in the order the participant lived
 * them. Used to group metrics and to order the timeline.
 */
export const SCENE_ORDER = ['vital_signs', 'x_ray', 'results_delivery', 'outside'] as const;

export type Scene = (typeof SCENE_ORDER)[number];

/**
 * The thirteen indicators, in the order of the metric tables. The database
 * returns rows alphabetically; a clinical reader expects the documented order.
 */
export const INDICATOR_ORDER = [
  'breathing',
  'blood_pressure',
  'pulse',
  'vitals_integration',
  'identity_verification',
  'patient_preparation',
  'acquisition_activation',
  'image_review',
  'correspondence',
  'text_validation',
  'explanation',
  'comprehension',
  'inconclusive',
] as const;

/** True when every metric of the indicator carries a real value. */
export function allEvaluated(metrics: readonly MetricRow[]): boolean {
  return metrics.every((m) => m.valueType !== 'not_evaluable');
}
