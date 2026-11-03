import type { Session, SessionEvent } from '@sc/shared';
import { breathing, bpMeasurement, bpPreparation, pulse, vitalsIntegration } from './indicators-vitals.ts';
import { identityVerification, imageCapture, imageReview, patientPreparation } from './indicators-xray.ts';
import { comprehension, correspondence, explanation, inconclusive, textValidation } from './indicators-results.ts';
import {
  eventsForProcedure,
  type ComputedMetric,
  type IndicatorDefinition,
  type IndicatorResult,
  type MetricSlot,
  type MetricValue,
  type CaseCriteriaValues,
  type StudyConfigValues,
} from './types.ts';

/** Every indicator the engine knows, in documentation order. */
export const INDICATORS: readonly IndicatorDefinition[] = [
  breathing,
  bpPreparation,
  bpMeasurement,
  pulse,
  vitalsIntegration,
  identityVerification,
  patientPreparation,
  imageCapture,
  imageReview,
  correspondence,
  textValidation,
  inconclusive,
  explanation,
  comprehension,
];

export interface EvaluateOptions {
  /** Only the header's case and the events are read; `close` is not required. */
  session: { header: Pick<Session['header'], 'case_id'>; events: SessionEvent[] };
  /** Params that apply to every case. */
  config: StudyConfigValues;
  /**
   * Expected values for the session's case. When the case is unknown or its
   * criteria are incomplete, affected metrics report `not_evaluable`.
   */
  caseCriteria: CaseCriteriaValues;
}

export interface EvaluationResult {
  results: IndicatorResult[];
  /** True when no metric came back `not_evaluable`. */
  complete: boolean;
  notEvaluableCount: number;
}

const SLOTS: readonly MetricSlot[] = ['m1', 'm2', 'm3'];

/**
 * Runs every indicator over a session.
 *
 * Pure: no IO, no clock, no database. The same input always produces the same
 * output, which is what makes metric results reproducible when a criterion
 * changes later.
 */
export function evaluateSession({ session, config, caseCriteria }: EvaluateOptions): EvaluationResult {
  const caseId = session.header.case_id;
  const sessionEvents = session.events as SessionEvent[];
  const results: IndicatorResult[] = [];
  let notEvaluableCount = 0;

  for (const definition of INDICATORS) {
    const events = eventsForProcedure(sessionEvents, definition.procedure);
    const produced = definition.evaluate({ events, sessionEvents, config, caseId, caseCriteria });
    const metrics: ComputedMetric[] = [];

    for (const slot of SLOTS) {
      const name = definition.names[slot];
      if (!name) continue;

      const value: MetricValue = produced[slot] ?? { kind: 'not_evaluable', reason: 'indicator produced no value' };
      if (value.kind === 'not_evaluable') notEvaluableCount++;

      metrics.push({ indicator: definition.id, slot, name, value });
    }

    results.push({
      indicator: definition.id,
      scene: definition.scene,
      procedure: definition.procedure,
      metrics,
      complete: metrics.every((m) => m.value.kind !== 'not_evaluable'),
    });
  }

  return { results, complete: notEvaluableCount === 0, notEvaluableCount };
}
