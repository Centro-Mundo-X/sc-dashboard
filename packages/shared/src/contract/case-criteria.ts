/**
 * Shape of a clinical case's expected values.
 *
 * These are the values a session is compared against. They belong to the case,
 * not to the session: a session records what the participant did, the case says
 * what was expected.
 *
 * Every field is optional so a case can be registered before its clinical
 * values are defined. Metrics whose reference is missing report
 * `not_evaluable` instead of comparing against an invented default.
 */

import * as v from 'valibot';
import { CaseIdSchema } from './schemas.ts';

export const VitaisKeySchema = v.object({
  respiratory_rate: v.pipe(v.number(), v.integer(), v.minValue(0)),
  blood_pressure: v.pipe(v.string(), v.regex(/^\d{2,3}\/\d{2,3}$/, 'Expected a value like 120/80')),
  pulse: v.pipe(v.number(), v.integer(), v.minValue(0)),
});
export type VitalsKey = v.InferOutput<typeof VitaisKeySchema>;

export const Scene3PhraseSchema = v.object({
  id: v.pipe(v.number(), v.integer(), v.minValue(1)),
  text: v.pipe(v.string(), v.minLength(1)),
  /** Whether the report actually supports this phrase. */
  supported: v.boolean(),
});
export type Scene3Phrase = v.InferOutput<typeof Scene3PhraseSchema>;

export const CaseCriteriaSchema = v.object({
  /** Expected vitals shown for this case. */
  vitals_key: v.optional(VitaisKeySchema),
  /** Cuff that matches the patient's arm. */
  correct_cuff: v.optional(v.picklist(['small', 'adult', 'large_adult'])),
  /** X-ray study the request asks for. */
  requested_study: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(64))),
  /** Phrases the participant must classify and communicate in scene 3. */
  scene3_phrases: v.optional(v.array(Scene3PhraseSchema)),
});
export type CaseCriteria = v.InferOutput<typeof CaseCriteriaSchema>;

export const CaseSchema = v.object({
  id: CaseIdSchema,
  label: v.pipe(v.string(), v.minLength(1), v.maxLength(120)),
  version: v.pipe(v.number(), v.integer(), v.minValue(1)),
  criteria: v.nullish(CaseCriteriaSchema, null),
  approved: v.boolean(),
});
export type CaseDefinition = v.InferOutput<typeof CaseSchema>;

/**
 * Reports which criteria a case is still missing. Empty means complete.
 *
 * Used to warn in the dashboard instead of letting a case silently produce
 * `not_evaluable` metrics for a whole scene.
 */
export function missingCriteria(criteria: CaseCriteria | null): string[] {
  if (!criteria) return ['vitals_key', 'correct_cuff', 'requested_study', 'scene3_phrases'];

  const missing: string[] = [];
  if (!criteria.vitals_key) missing.push('vitals_key');
  if (!criteria.correct_cuff) missing.push('correct_cuff');
  if (!criteria.requested_study) missing.push('requested_study');
  if (!criteria.scene3_phrases || criteria.scene3_phrases.length === 0) {
    missing.push('scene3_phrases');
  }
  return missing;
}
