import type { SessionEvent } from '@sc/shared';
import {
  asRecord,
  caseParam,
  firstByAction,
  isCompleted,
  notEvaluable,
  ratio,
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

/** Phrases declared for a case: `scene3_phrases[caseId]` is an array of {id, supported}. */
function phrasesForCase(config: Record<string, unknown>, caseId: string): unknown[] | undefined {
  const value = caseParam(config, 'scene3_phrases', caseId);
  return Array.isArray(value) ? value : undefined;
}

export const correspondence: IndicatorDefinition = {
  id: 'correspondence',
  procedure: 'correspondence',
  scene: 'results_delivery',
  names: { m1: 'identifiers_ratio', m2: 'report_correct', m3: 'communications_before_check' },
  evaluate: ({ events }) => {
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
    const spoken = firstByAction(events, 'verbal_response');
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
  evaluate: ({ events, config, caseId }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const classified = events.filter((e) => e.action === 'phrase_classified');
    const expected = phrasesForCase(config, caseId);

    if (!expected) {
      out.m1 = notEvaluable(`no scene3 phrases for case ${caseId}`);
      out.m2 = notEvaluable(`no scene3 phrases for case ${caseId}`);
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
    const status = recognized?.value === null || recognized?.value === undefined ? undefined : String(recognized.value);

    out.m1 =
      status === undefined ? notEvaluable('report status not recorded') : { kind: 'boolean', value: status.length > 0 };

    // Communicating a definitive result while the report is preliminary is the
    // improper case. Absent evidence is not evaluated.
    const improper = events.filter(
      (e) => e.action === 'verbal_response' && e.value === 'definitive_conclusion' && status === 'preliminary',
    ).length;
    out.m2 =
      status === undefined
        ? notEvaluable('report status not recorded')
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
  evaluate: ({ events, config, caseId }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const responses = events.filter((e) => e.action === 'verbal_response');
    const expected = phrasesForCase(config, caseId);

    if (!expected) {
      out.m1 = notEvaluable(`no scene3 phrases for case ${caseId}`);
      out.m2 = notEvaluable(`no scene3 phrases for case ${caseId}`);
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
  evaluate: ({ events }) => {
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

    const communicated = events.filter((e) => e.action === 'phrase_communicated');
    const understood = communicated.filter((e) => e.outcome !== 'omitted').length;
    out.m3 = communicated.length > 0 ? ratio(understood, communicated.length) : notEvaluable('no instructions communicated');

    return out;
  },
};
