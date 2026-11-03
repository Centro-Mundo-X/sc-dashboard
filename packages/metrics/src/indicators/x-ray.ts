import type { SessionEvent } from '@sc/shared';
import {
  asStringArray,
  caseParam,
  firstByAction,
  isCompleted,
  notEvaluable,
  ratio,
  type IndicatorDefinition,
  type MetricValue,
} from '../types.ts';

function elapsedMs(from: string | undefined, to: string | undefined): number | undefined {
  if (!from || !to) return undefined;
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end)) return undefined;
  return Math.max(0, end - start);
}

/** Value of an event's `value` field as a string, or undefined. */
function valueAsString(event: SessionEvent | undefined): string | undefined {
  if (!event || event.value === null || event.value === undefined) return undefined;
  return String(event.value);
}

// ---------------------------------------------------------------------------
// Table 2 · Scene: X-ray
// ---------------------------------------------------------------------------

/**
 * 1. Verification before the exam
 * M1 Comprobaciones realizadas / aplicables
 * M2 Selected study against the requested one
 * M3 Activations before completing the verification
 */
export const identityVerification: IndicatorDefinition = {
  id: 'identity_verification',
  procedure: 'identity_verification',
  scene: 'x_ray',
  names: { m1: 'checks_completed_ratio', m2: 'study_matches_request', m3: 'activations_before_check' },
  evaluate: ({ events, sessionEvents, caseCriteria }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const consoleOpened = firstByAction(events, 'console_opened');
    const wristband = firstByAction(events, 'wristband_read');
    const dialogue = firstByAction(events, 'identification_dialogue');
    const study = firstByAction(events, 'study_selected');

    out.m1 = ratio([consoleOpened, wristband, dialogue].filter(isCompleted).length, 3);

    // The request demands a specific study; the participant picks one.
    const requested = caseParam(caseCriteria, 'requested_study');
    const chosen = valueAsString(study);
    if (requested === undefined) {
      out.m2 = notEvaluable('case has no requested_study');
    } else if (chosen === undefined) {
      out.m2 = notEvaluable('no study selected');
    } else {
      out.m2 = { kind: 'boolean', value: chosen === requested };
    }

    // Activations that happened before the identity check finished.
    const capture = firstByAction(sessionEvents, 'capture_activated');
    const checkDoneAt = [wristband, dialogue].filter(isCompleted).at(-1)?.occurred_at;
    if (!capture || !checkDoneAt) {
      out.m3 = notEvaluable('missing capture or verification event');
    } else {
      out.m3 = { kind: 'boolean', value: capture.occurred_at < checkDoneAt };
    }

    return out;
  },
};

/**
 * 2. Patient preparation
 * M1 Instrucciones pertinentes comunicadas / previstas
 * M2 Patient confirmation: yes/no
 * M3 Acquisition start before completing the preparation
 */
export const patientPreparation: IndicatorDefinition = {
  id: 'patient_preparation',
  procedure: 'patient_preparation',
  scene: 'x_ray',
  names: { m1: 'instructions_ratio', m2: 'patient_confirmed', m3: 'capture_before_prep' },
  evaluate: ({ events, sessionEvents }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const phrases = events.filter((e) => e.action === 'phrase_communicated');
    out.m1 =
      phrases.length > 0
        ? ratio(phrases.filter(isCompleted).length, phrases.length)
        : notEvaluable('no instructions expected');

    out.m2 = { kind: 'boolean', value: isCompleted(firstByAction(events, 'patient_confirmed')) };

    const capture = firstByAction(sessionEvents, 'capture_activated');
    const confirmed = firstByAction(events, 'patient_confirmed');
    if (!capture || !confirmed) {
      out.m3 = notEvaluable('missing capture or confirmation event');
    } else {
      out.m3 = { kind: 'boolean', value: capture.occurred_at < confirmed.occurred_at };
    }

    return out;
  },
};

/**
 * 3. Acquisition activation
 * M1 Activation with requirements complete: yes/no
 * M2 Premature activation attempts
 * M3 Time from requirements complete to activation
 */
export const acquisitionActivation: IndicatorDefinition = {
  id: 'acquisition_activation',
  procedure: 'image_capture',
  scene: 'x_ray',
  names: { m1: 'activated_with_requirements', m2: 'premature_attempts', m3: 'time_from_requirements_ms' },
  evaluate: ({ events }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const requirements = firstByAction(events, 'requirements_completed');
    const activated = firstByAction(events, 'capture_activated');
    const rejected = events.filter((e) => e.action === 'capture_rejected');

    if (!activated) {
      out.m1 = notEvaluable('no activation attempted');
    } else if (requirements && activated.occurred_at < requirements.occurred_at) {
      out.m1 = { kind: 'boolean', value: false };
    } else {
      out.m1 = { kind: 'boolean', value: true };
    }

    // Attempts the system refused because a requirement was still pending.
    out.m2 = { kind: 'number', value: rejected.length };

    const elapsed = elapsedMs(requirements?.occurred_at, activated?.occurred_at);
    out.m3 =
      elapsed === undefined
        ? notEvaluable('missing requirements or activation event')
        : { kind: 'number', value: elapsed };

    return out;
  },
};

/**
 * 4. Review of the acquired image
 * M1 Image review performed: yes/no
 * M2 Decision agreeing with the technical quality key
 * M3 Repeticiones justificadas / repeticiones realizadas
 */
export const imageReview: IndicatorDefinition = {
  id: 'image_review',
  procedure: 'image_review',
  scene: 'x_ray',
  names: { m1: 'review_performed', m2: 'decision_matches_quality_key', m3: 'justified_repeats_ratio' },
  evaluate: ({ events }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const displayed = firstByAction(events, 'image_displayed');
    const accepted = firstByAction(events, 'image_accepted');
    const rejectedImage = firstByAction(events, 'image_rejected');
    const repeatsRequested = events.filter((e) => e.action === 'image_repeat_requested');

    out.m1 = { kind: 'boolean', value: isCompleted(accepted) || isCompleted(rejectedImage) };

    // The case says whether the image carries a technical defect. Accepting a
    // defective image, or rejecting a clean one, is a discordant decision.
    const defectPresent = displayed?.context?.['programmed_defect'];
    const decision = isCompleted(rejectedImage) ? 'rejected' : isCompleted(accepted) ? 'accepted' : undefined;

    if (defectPresent === undefined) {
      out.m2 = notEvaluable('scenario did not report image quality');
    } else if (decision === undefined) {
      out.m2 = notEvaluable('no decision recorded');
    } else {
      const expected = defectPresent === true ? 'rejected' : 'accepted';
      out.m2 = { kind: 'boolean', value: decision === expected };
    }

    // A repeat is justified when the image had the defect. Without repeats
    // there is nothing to judge, so the metric reports not_evaluable.
    if (repeatsRequested.length === 0) {
      out.m3 = notEvaluable('no repeats requested');
    } else if (defectPresent === undefined) {
      out.m3 = notEvaluable('scenario did not report image quality');
    } else {
      const justified = repeatsRequested.filter(() => defectPresent === true).length;
      out.m3 = ratio(justified, repeatsRequested.length);
    }

    return out;
  },
};
