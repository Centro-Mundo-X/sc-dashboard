/** Contract enumerations. Values travel over the wire, so they are English. */

export const SCENES = [
  'lobby',
  'vital_signs',
  'x_ray',
  'results_delivery',
  'report',
] as const;
export type Scene = (typeof SCENES)[number];

/** Scenes that must be present for a session to count as complete. */
export const CLINICAL_SCENES = [
  'vital_signs',
  'x_ray',
  'results_delivery',
] as const satisfies readonly Scene[];

/** Clinical procedures. Group events for metric calculation. */
export const PROCEDURES = [
  'none',
  'breathing',
  'blood_pressure',
  'pulse',
  'vitals_integration',
  'identity_verification',
  'patient_preparation',
  'image_capture',
  'image_review',
  'correspondence',
  'text_validation',
  'inconclusive',
  'explanation',
  'comprehension',
] as const;
export type Procedure = (typeof PROCEDURES)[number];

/**
 * Observable outcome of an action.
 *
 * `omitted` is not an error: the system records without blocking and does not
 * read absence as clinical failure.
 */
export const OUTCOMES = [
  'started',
  'completed',
  'omitted',
  'corrected',
  'cancelled',
  'not_applicable',
] as const;
export type Outcome = (typeof OUTCOMES)[number];

/** Study phase. `single` when there is no pretest/posttest. */
export const PHASES = ['single', 'pretest', 'posttest'] as const;
export type Phase = (typeof PHASES)[number];

export const SESSION_STATUSES = ['complete', 'incomplete'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/**
 * Why a session ended incomplete. Optional: the app may not have written it.
 */
export const INCOMPLETE_REASONS = [
  'participant_abandoned',
  'technical_failure',
  'timeout',
  'other',
  'unknown',
] as const;
export type IncompleteReason = (typeof INCOMPLETE_REASONS)[number];

export const CONTRACT_VERSION = '1.0' as const;
