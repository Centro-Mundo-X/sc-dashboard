import type { SessionEvent } from '@sc/shared';

/** Metric slots produced by every indicator. */
export type MetricSlot = 'm1' | 'm2' | 'm3';

export type MetricValue =
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number }
  | { kind: 'ratio'; value: number; numerator: number; denominator: number }
  | { kind: 'text'; value: string }
  /** Not enough data, or a required parameter is missing. Never a silent false. */
  | { kind: 'not_evaluable'; reason: string };

export interface ComputedMetric {
  indicator: string;
  slot: MetricSlot;
  /** Stable name used as the column in storage and UI. */
  name: string;
  value: MetricValue;
}

export interface IndicatorResult {
  indicator: string;
  scene: string;
  procedure: string;
  metrics: ComputedMetric[];
  /** True when every slot produced a real value. */
  complete: boolean;
}

export type StudyConfigValues = Record<string, unknown>;

/** Everything an indicator needs. Kept narrow so indicators stay pure. */
export interface IndicatorContext {
  /** Events of this indicator's own procedure. */
  events: SessionEvent[];
  /**
   * Every event of the session. Some indicators need to see events from other
   * procedures, e.g. knowing when the capture fired while judging preparation.
   */
  sessionEvents: SessionEvent[];
  /** Params that apply to every case: gaze threshold, valid sources, checks. */
  config: StudyConfigValues;
  caseId: string;
  /**
   * Expected values for this case. Missing pieces mean the metric cannot be
   * evaluated; they are never replaced by a default.
   */
  caseCriteria: CaseCriteriaValues;
}

/** The case-specific reference values, as stored on the case row. */
export type CaseCriteriaValues = {
  vitals_key?: { respiratory_rate: number; blood_pressure: string; pulse: number };
  correct_cuff?: string;
  requested_study?: string;
  scene3_phrases?: Array<{ id: number; text: string; supported: boolean }>;
};

export interface IndicatorDefinition {
  /** Stable identifier, documented in `docs/METRICS.md`. */
  id: string;
  /** Procedure whose events this indicator consumes. */
  procedure: string;
  /** Scene the procedure belongs to, used for grouping in the UI. */
  scene: string;
  /** Metric names per slot, in order M1, M2, M3. */
  names: { m1: string; m2?: string; m3?: string };
  evaluate: (ctx: IndicatorContext) => Partial<Record<MetricSlot, MetricValue>>;
}

/** Helpers shared by indicator implementations. */

export function eventsForProcedure(events: SessionEvent[], procedure: string): SessionEvent[] {
  return events.filter((e) => e.procedure === procedure);
}

export function findByAction(events: SessionEvent[], ...actions: string[]): SessionEvent[] {
  const wanted = new Set(actions);
  return events.filter((e) => wanted.has(e.action));
}

export function firstByAction(events: SessionEvent[], ...actions: string[]): SessionEvent | undefined {
  const wanted = new Set(actions);
  return events.find((e) => wanted.has(e.action));
}

export function isCompleted(event: SessionEvent | undefined): boolean {
  return event?.outcome === 'completed' || event?.outcome === 'corrected';
}

export function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string');
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export function notEvaluable(reason: string): MetricValue {
  return { kind: 'not_evaluable', reason };
}

export function ratio(numerator: number, denominator: number): MetricValue {
  if (denominator === 0) return notEvaluable('no applicable items');
  return { kind: 'ratio', value: numerator / denominator, numerator, denominator };
}

/** Reads a field of the case's criteria, e.g. `correct_cuff`. */
export function caseParam<K extends keyof CaseCriteriaValues>(
  criteria: CaseCriteriaValues,
  key: K,
): CaseCriteriaValues[K] {
  return criteria[key];
}
