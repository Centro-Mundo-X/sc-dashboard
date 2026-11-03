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
  events: SessionEvent[];
  config: StudyConfigValues;
  caseId: string;
}

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

/** Reads a per-case map from config, e.g. `cuff_by_case[caseId]`. */
export function caseParam(
  config: StudyConfigValues,
  key: string,
  caseId: string,
): unknown {
  const map = asRecord(config[key]);
  if (!map) return undefined;
  return map[caseId];
}
