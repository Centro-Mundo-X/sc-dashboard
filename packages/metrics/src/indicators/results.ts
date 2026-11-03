import type { SessionEvent } from '@sc/shared';
import {
  asNumber,
  asRecord,
  caseParam,
  type CaseCriteriaValues,
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

/** Phrases the participant must classify, as declared on the case. */
function phrasesForCase(criteria: CaseCriteriaValues): unknown[] | undefined {
  const value = caseParam(criteria, 'scene3_phrases');
  return Array.isArray(value) ? value : undefined;
}

export const correspondence: IndicatorDefinition = {
  id: 'correspondence',
  procedure: 'correspondence',
  scene: 'results_delivery',
  names: { m1: 'identifiers_ratio', m2: 'report_correct', m3: 'communications_before_check' },
  evaluate: ({ events, sessionEvents }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const panel = firstByAction(events, 'panel_opened');
    const compared = firstByAction(events, 'identifiers_compared');

    out.m1 = ratio([panel, compared].filter(isCompleted).length, 2);

    const matches = compared?.context?.['matches'];
    out.m2 =
      matches === undefined
        ? notEvaluable('identifiers not compared')
        : { kind: 'boolean', value: matches === true };

    const corrected = firstByAction(events, 'report_corrected');
    const spoken = firstByAction(sessionEvents, 'verbal_response');
    const checkedAt = [compared, corrected].filter(isCompleted).at(-1)?.occurred_at;
    if (!spoken || !checkedAt) {
      out.m3 = notEvaluable('missing verification or communication event');
    } else {
      out.m3 = { kind: 'boolean', value: spoken.occurred_at < checkedAt };
    }

    return out;
  },
};

export const textValidation: IndicatorDefinition = {
  id: 'text_validation',
  procedure: 'text_validation',
  scene: 'results_delivery',
  names: { m1: 'phrases_classified_ratio', m2: 'unsupported_accepted', m3: 'corrections_before_communicating' },
  evaluate: ({ events, caseCriteria }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const classified = events.filter((e) => e.action === 'phrase_classified');
    const expected = phrasesForCase(caseCriteria);

    if (!expected) {
      out.m1 = notEvaluable('case has no scene3_phrases');
      out.m2 = notEvaluable('case has no scene3_phrases');
    } else {
      out.m1 = ratio(classified.length, expected.length);

      // A phrase is unsupported when the config marks it so and the participant
      // classified it as supported.
      const unsupportedIds = new Set(
        expected
          .map((phrase) => asRecord(phrase))
          .filter((phrase): phrase is Record<string, unknown> => phrase !== undefined)
          .filter((phrase) => phrase['supported'] === false)
          .map((phrase) => phrase['id']),
      );

      let accepted = 0;
      for (const event of classified) {
        const phraseId = event.context?.['phrase_id'];
        const verdict = event.value;
        if (unsupportedIds.has(phraseId) && verdict === 'supported') accepted++;
      }
      out.m2 = { kind: 'number', value: accepted };
    }

    out.m3 = { kind: 'boolean', value: events.some((e) => e.outcome === 'corrected') };

    return out;
  },
};

export const inconclusive: IndicatorDefinition = {
  id: 'inconclusive',
  procedure: 'inconclusive',
  scene: 'results_delivery',
  names: { m1: 'status_recognized', m2: 'improper_final_communications', m3: 'clarification_requests' },
  evaluate: ({ events }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const recognized = firstByAction(events, 'report_status_recognized');
    const answered = recognized?.value === null || recognized?.value === undefined
      ? undefined
      : String(recognized.value);
    // The scenario states the real status on the panel; recognition means the
    // participant's answer matches it.
    const actual = recognized?.context?.['actual_status'];
    const actualStatus = actual === null || actual === undefined ? undefined : String(actual);

    if (answered === undefined) {
      out.m1 = notEvaluable('report status not answered');
    } else if (actualStatus === undefined) {
      out.m1 = notEvaluable('scenario did not report the actual status');
    } else {
      out.m1 = { kind: 'boolean', value: answered === actualStatus };
    }

    // Communicating a definitive result while the report is preliminary is the
    // improper case. Absent evidence is not evaluated.
    const improper = events.filter(
      (e) =>
        e.action === 'verbal_response' &&
        e.value === 'definitive_conclusion' &&
        actualStatus === 'preliminary',
    ).length;
    out.m2 =
      actualStatus === undefined
        ? notEvaluable('scenario did not report the actual status')
        : { kind: 'number', value: improper };

    const requests = events.filter((e) => e.action === 'clarification_requested').length;
    out.m3 = { kind: 'number', value: requests };

    return out;
  },
};

export const explanation: IndicatorDefinition = {
  id: 'explanation',
  procedure: 'explanation',
  scene: 'results_delivery',
  names: { m1: 'messages_concordant_ratio', m2: 'unsupported_claims', m3: 'relevant_info_omitted' },
  evaluate: ({ events, caseCriteria }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const responses = events.filter((e) => e.action === 'verbal_response');
    const expected = phrasesForCase(caseCriteria);

    if (!expected) {
      out.m1 = notEvaluable('case has no scene3_phrases');
      out.m2 = notEvaluable('case has no scene3_phrases');
    } else {
      const supportedIds = new Set(
        expected
          .map((phrase) => asRecord(phrase))
          .filter((phrase): phrase is Record<string, unknown> => phrase !== undefined)
          .filter((phrase) => phrase['supported'] === true)
          .map((phrase) => phrase['id']),
      );
      const concordant = responses.filter((e) => supportedIds.has(e.context?.['phrase_id'])).length;
      out.m1 = responses.length > 0 ? ratio(concordant, responses.length) : notEvaluable('no verbal response');

      const unsupported = responses.filter((e) => {
        const id = e.context?.['phrase_id'];
        return id !== undefined && !supportedIds.has(id);
      }).length;
      out.m2 = { kind: 'number', value: unsupported };
    }

    out.m3 = { kind: 'number', value: events.filter((e) => e.outcome === 'omitted').length };

    return out;
  },
};

export const comprehension: IndicatorDefinition = {
  id: 'comprehension',
  procedure: 'comprehension',
  scene: 'results_delivery',
  names: { m1: 'check_performed', m2: 'misunderstandings_resolved', m3: 'instructions_understood_ratio' },
  evaluate: ({ events, sessionEvents }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const asked = firstByAction(events, 'comprehension_asked');
    out.m1 = { kind: 'boolean', value: isCompleted(asked) };

    const misunderstanding = asked?.context?.['misunderstanding_detected'];
    const clarified = events.some((e) => e.action === 'clarification_requested' || e.outcome === 'corrected');

    if (misunderstanding === undefined) {
      out.m2 = notEvaluable('no misunderstanding flag recorded');
    } else if (misunderstanding !== true) {
      out.m2 = notEvaluable('no misunderstanding occurred');
    } else {
      out.m2 = { kind: 'boolean', value: clarified };
    }

    // "Instructions understood in the patient's answer / instructions
    // communicated": the numerator is what the patient showed understanding
    // of, which the scenario reports on the comprehension event.
    const communicated = sessionEvents.filter((e) => e.action === 'phrase_communicated');
    const understoodCount = asNumber(asked?.context?.['instructions_understood']);
    if (communicated.length === 0) {
      out.m3 = notEvaluable('no instructions communicated');
    } else if (understoodCount === undefined) {
      out.m3 = notEvaluable('patient response did not report understanding');
    } else {
      out.m3 = ratio(understoodCount, communicated.length);
    }

    return out;
  },
};
