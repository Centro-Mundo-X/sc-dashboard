import type { SessionEvent } from '@sc/shared';
import {
  asStringArray,
  caseParam,
  firstByAction,
  isCompleted,
  notEvaluable,
  ratio,
  type IndicatorContext,
  type IndicatorDefinition,
  type MetricValue,
} from './types.ts';

function elapsedMs(from: string | undefined, to: string | undefined): number | undefined {
  if (!from || !to) return undefined;
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end)) return undefined;
  return Math.max(0, end - start);
}

export const identityVerification: IndicatorDefinition = {
  id: 'identity_verification',
  procedure: 'identity_verification',
  scene: 'x_ray',
  names: { m1: 'checks_completed_ratio', m2: 'study_matches_request', m3: 'activations_before_check' },
  evaluate: ({ events, config, caseId }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const consoleOpened = firstByAction(events, 'console_opened');
    const wristband = firstByAction(events, 'wristband_read');
    const dialogue = firstByAction(events, 'identification_dialogue');
    const study = firstByAction(events, 'study_selected');

    const checks = [consoleOpened, wristband, dialogue].filter(isCompleted).length;
    out.m1 = ratio(checks, 3);

    const requested = caseParam(config, 'requested_study_by_case', caseId);
    const chosen = study?.value === null || study?.value === undefined ? undefined : String(study.value);

    if (typeof requested !== 'string') {
      out.m2 = notEvaluable(`no requested study for case ${caseId}`);
    } else if (chosen === undefined) {
      out.m2 = notEvaluable('no study selected');
    } else {
      out.m2 = { kind: 'boolean', value: chosen === requested };
    }

    // Captures taken before the identity check finished. The spec records this
    // without blocking the participant.
    const capture = firstByAction(events, 'capture_activated');
    const checkDoneAt = [wristband, dialogue].filter(isCompleted).at(-1)?.occurred_at;
    if (!capture || !checkDoneAt) {
      out.m3 = notEvaluable('missing capture or verification event');
    } else {
      out.m3 = { kind: 'boolean', value: capture.occurred_at < checkDoneAt };
    }

    return out;
  },
};

export const patientPreparation: IndicatorDefinition = {
  id: 'patient_preparation',
  procedure: 'patient_preparation',
  scene: 'x_ray',
  names: { m1: 'instructions_ratio', m2: 'patient_confirmed', m3: 'capture_before_prep' },
  evaluate: ({ events }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const phrases = events.filter((e) => e.action === 'phrase_communicated');
    const communicated = phrases.filter(isCompleted).length;
    const total = phrases.length;

    out.m1 = total > 0 ? ratio(communicated, total) : notEvaluable('no instructions expected');
    out.m2 = { kind: 'boolean', value: isCompleted(firstByAction(events, 'patient_confirmed')) };

    const capture = firstByAction(events, 'capture_activated');
    const confirmed = firstByAction(events, 'patient_confirmed');
    if (!capture || !confirmed) {
      out.m3 = notEvaluable('missing capture or confirmation event');
    } else {
      out.m3 = { kind: 'boolean', value: capture.occurred_at < confirmed.occurred_at };
    }

    return out;
  },
};

export const imageCapture: IndicatorDefinition = {
  id: 'image_capture',
  procedure: 'image_capture',
  scene: 'x_ray',
  names: { m1: 'capture_executed' },
  evaluate: ({ events }) => ({
    m1: { kind: 'boolean', value: isCompleted(firstByAction(events, 'capture_activated')) },
  }),
};

export const imageReview: IndicatorDefinition = {
  id: 'image_review',
  procedure: 'image_review',
  scene: 'x_ray',
  names: { m1: 'review_performed', m2: 'defect_detected', m3: 'review_duration_ms' },
  evaluate: ({ events }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const displayed = firstByAction(events, 'image_displayed');
    const reviewed = firstByAction(events, 'image_reviewed');

    out.m1 = { kind: 'boolean', value: isCompleted(reviewed) };

    // The programmed defect is a property of the scene, not of the participant.
    const programmed = displayed?.context?.['programmed_defect'];
    out.m2 =
      programmed === undefined
        ? notEvaluable('no defect flag recorded')
        : { kind: 'boolean', value: programmed === true };

    const duration = elapsedMs(displayed?.occurred_at, reviewed?.occurred_at);
    out.m3 = duration === undefined ? notEvaluable('missing review window') : { kind: 'number', value: duration };

    return out;
  },
};
