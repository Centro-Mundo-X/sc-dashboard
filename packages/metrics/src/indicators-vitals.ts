import type { SessionEvent } from '@sc/shared';
import {
  asNumber,
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

/** Milliseconds between two ISO timestamps, or undefined if either is missing. */
function elapsedMs(from: string | undefined, to: string | undefined): number | undefined {
  if (!from || !to) return undefined;
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end)) return undefined;
  return Math.max(0, end - start);
}

/** Value of an event's `value` field as a string, or undefined. */
function valueAsString(event: SessionEvent | undefined): string | undefined {
  if (!event || event.value === null) return undefined;
  return String(event.value);
}

export const breathing: IndicatorDefinition = {
  id: 'breathing',
  procedure: 'breathing',
  scene: 'vital_signs',
  names: { m1: 'observation_completed', m2: 'matches_key', m3: 'time_to_record_ms' },
  evaluate: ({ events, config, caseId }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const minGaze = asNumber(config['min_gaze_ms']);
    const validSources = asStringArray(config['valid_breathing_sources']);

    const gaze = firstByAction(events, 'gaze_chest');
    const monitor = firstByAction(events, 'monitor_checked');
    const recorded = firstByAction(events, 'value_recorded');

    // Either a long enough chest gaze or a monitor check counts, if both are valid.
    const gazeDuration = asNumber(gaze?.context?.['gaze_duration_ms']);
    const gazeCounts = gazeDuration !== undefined && minGaze !== undefined && gazeDuration >= minGaze;
    const monitorCounts = isCompleted(monitor) && (validSources === undefined || validSources.includes('monitor'));

    if (minGaze === undefined) {
      out.m1 = notEvaluable('min_gaze_ms not configured');
    } else {
      out.m1 = { kind: 'boolean', value: gazeCounts || monitorCounts };
    }

    const expected = caseParam(config, 'vitals_key_by_case', caseId);
    const expectedRate =
      typeof expected === 'object' && expected !== null
        ? asNumber((expected as Record<string, unknown>)['respiratory_rate'])
        : undefined;
    const recordedRate = asNumber(recorded?.value);

    if (expectedRate === undefined) {
      out.m2 = notEvaluable(`no respiratory key for case ${caseId}`);
    } else if (recordedRate === undefined) {
      out.m2 = notEvaluable('no respiratory rate recorded');
    } else {
      out.m2 = { kind: 'boolean', value: recordedRate === expectedRate };
    }

    const firstSource = gaze ?? monitor;
    const elapsed = elapsedMs(firstSource?.occurred_at, recorded?.occurred_at);
    out.m3 = elapsed === undefined ? notEvaluable('missing observation or record event') : { kind: 'number', value: elapsed };

    return out;
  },
};

export const bpPreparation: IndicatorDefinition = {
  id: 'bp_preparation',
  procedure: 'blood_pressure',
  scene: 'vital_signs',
  names: { m1: 'checks_completed_ratio', m2: 'cuff_matches' },
  evaluate: ({ events, config, caseId }) => {
    const out: Partial<Record<'m1' | 'm2', MetricValue>> = {};

    const required = asStringArray(config['bp_required_checks']);
    const drawer = firstByAction(events, 'drawer_opened');
    const cuffSelected = firstByAction(events, 'cuff_selected');

    // Each required check maps to the action that proves it. Unknown checks are
    // not counted as failures: they are simply not evaluable.
    const checksDone = [isCompleted(drawer) ? 'drawer' : undefined, isCompleted(cuffSelected) ? 'cuff' : undefined].filter(
      (v): v is string => v !== undefined,
    );
    out.m1 = required && required.length > 0 ? ratio(checksDone.length, required.length) : notEvaluable('bp_required_checks not configured');

    const expectedCuff = caseParam(config, 'cuff_by_case', caseId);
    const chosen = valueAsString(cuffSelected);
    if (typeof expectedCuff !== 'string') {
      out.m2 = notEvaluable(`no cuff key for case ${caseId}`);
    } else if (chosen === undefined) {
      out.m2 = notEvaluable('no cuff selected');
    } else {
      out.m2 = { kind: 'boolean', value: chosen === expectedCuff };
    }

    return out;
  },
};

export const bpMeasurement: IndicatorDefinition = {
  id: 'bp_measurement',
  procedure: 'blood_pressure',
  scene: 'vital_signs',
  names: { m1: 'reading_recorded', m2: 'reading_matches_chart' },
  evaluate: ({ events }) => {
    const out: Partial<Record<'m1' | 'm2', MetricValue>> = {};

    const displayed = firstByAction(events, 'reading_displayed');
    const recorded = events
      .filter((e) => e.action === 'value_recorded' && e.object === 'field_bp')
      .at(-1);

    out.m1 = { kind: 'boolean', value: recorded !== undefined };

    const shown = valueAsString(displayed);
    const written = valueAsString(recorded);
    if (shown === undefined) {
      out.m2 = notEvaluable('no blood pressure displayed');
    } else if (written === undefined) {
      out.m2 = notEvaluable('no blood pressure recorded');
    } else {
      out.m2 = { kind: 'boolean', value: shown === written };
    }

    return out;
  },
};

export const pulse: IndicatorDefinition = {
  id: 'pulse',
  procedure: 'pulse',
  scene: 'vital_signs',
  names: { m1: 'review_performed', m2: 'matches_displayed', m3: 'corrected_before_confirm' },
  evaluate: ({ events, config }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const validSources = asStringArray(config['valid_pulse_sources']);
    const wrist = firstByAction(events, 'wrist_touched');
    const monitor = firstByAction(events, 'monitor_checked');

    const wristCounts = isCompleted(wrist) && (validSources === undefined || validSources.includes('wrist'));
    const monitorCounts = isCompleted(monitor) && (validSources === undefined || validSources.includes('monitor'));

    out.m1 = { kind: 'boolean', value: wristCounts || monitorCounts };

    const recorded = events.filter((e) => e.action === 'value_recorded' && e.object === 'field_pulse').at(-1);
    const written = asNumber(recorded?.value);
    const displayed = asNumber(monitor?.value);

    if (displayed === undefined || written === undefined) {
      out.m2 = notEvaluable('missing displayed or recorded pulse');
    } else {
      out.m2 = { kind: 'boolean', value: displayed === written };
    }

    const corrected = events.some((e) => e.outcome === 'corrected');
    out.m3 = { kind: 'boolean', value: corrected };

    return out;
  },
};

export const vitalsIntegration: IndicatorDefinition = {
  id: 'vitals_integration',
  procedure: 'vitals_integration',
  scene: 'vital_signs',
  names: { m1: 'correct_vitals_of_three', m2: 'omitted_fields', m3: 'chart_discrepancies' },
  evaluate: ({ events, config, caseId }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const expected = caseParam(config, 'vitals_key_by_case', caseId) as Record<string, unknown> | undefined;
    const recorded = events.filter((e) => e.action === 'value_recorded');
    const byField = new Map(recorded.map((e) => [e.object ?? '', e]));

    const rr = asNumber(byField.get('field_rr')?.value);
    const bp = byField.get('field_bp')?.value;
    const pulseValue = asNumber(byField.get('field_pulse')?.value);

    if (!expected) {
      out.m1 = notEvaluable(`no vitals key for case ${caseId}`);
      out.m3 = notEvaluable(`no vitals key for case ${caseId}`);
    } else {
      let correct = 0;
      if (rr !== undefined && rr === asNumber(expected['respiratory_rate'])) correct++;
      if (bp !== undefined && String(bp) === String(expected['blood_pressure'])) correct++;
      if (pulseValue !== undefined && pulseValue === asNumber(expected['pulse'])) correct++;

      out.m1 = ratio(correct, 3);

      const discrepancies =
        (rr !== undefined && rr !== asNumber(expected['respiratory_rate']) ? 1 : 0) +
        (bp !== undefined && String(bp) !== String(expected['blood_pressure']) ? 1 : 0) +
        (pulseValue !== undefined && pulseValue !== asNumber(expected['pulse']) ? 1 : 0);
      out.m3 = { kind: 'number', value: discrepancies };
    }

    const expectedFields = ['field_rr', 'field_bp', 'field_pulse'];
    out.m2 = { kind: 'number', value: expectedFields.filter((f) => !byField.has(f)).length };

    return out;
  },
};
