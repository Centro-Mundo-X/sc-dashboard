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
  if (!event || event.value === null || event.value === undefined) return undefined;
  return String(event.value);
}

// ---------------------------------------------------------------------------
// Cuadro 1 · Escena: toma de signos vitales
// ---------------------------------------------------------------------------

/**
 * 1. Revisión de la respiración
 * M1 Observación completada: sí/no
 * M2 Concordancia del registro con la clave del caso
 * M3 Tiempo entre mostrar la respiración y registrar el dato
 */
export const breathing: IndicatorDefinition = {
  id: 'breathing',
  procedure: 'breathing',
  scene: 'vital_signs',
  names: { m1: 'observation_completed', m2: 'matches_key', m3: 'time_to_record_ms' },
  evaluate: ({ events, config, caseCriteria }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const minGaze = asNumber(config['min_gaze_ms']);
    const validSources = asStringArray(config['valid_breathing_sources']);

    const gaze = firstByAction(events, 'gaze_chest');
    const monitor = firstByAction(events, 'monitor_checked');
    const recorded = firstByAction(events, 'value_recorded');

    const gazeDuration = asNumber(gaze?.context?.['gaze_duration_ms']);
    const gazeCounts = gazeDuration !== undefined && minGaze !== undefined && gazeDuration >= minGaze;
    const monitorCounts =
      isCompleted(monitor) && (validSources === undefined || validSources.includes('monitor'));

    out.m1 =
      minGaze === undefined
        ? notEvaluable('min_gaze_ms not configured')
        : { kind: 'boolean', value: gazeCounts || monitorCounts };

    const expected = caseParam(caseCriteria, 'vitals_key');
    const recordedRate = asNumber(recorded?.value);

    if (!expected) {
      out.m2 = notEvaluable('case has no vitals_key');
    } else if (recordedRate === undefined) {
      out.m2 = notEvaluable('no respiratory rate recorded');
    } else {
      out.m2 = { kind: 'boolean', value: recordedRate === expected.respiratory_rate };
    }

    const firstSource = gaze ?? monitor;
    const elapsed = elapsedMs(firstSource?.occurred_at, recorded?.occurred_at);
    out.m3 =
      elapsed === undefined
        ? notEvaluable('missing observation or record event')
        : { kind: 'number', value: elapsed };

    return out;
  },
};

/**
 * 2. Toma de presión arterial
 * M1 Comprobaciones completadas / aplicables
 * M2 Selección del brazalete concordante: sí/no
 * M3 Lectura registrada frente a lectura mostrada
 */
export const bloodPressure: IndicatorDefinition = {
  id: 'blood_pressure',
  procedure: 'blood_pressure',
  scene: 'vital_signs',
  names: { m1: 'checks_completed_ratio', m2: 'cuff_matches', m3: 'reading_matches_display' },
  evaluate: ({ events, config, caseCriteria }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    // M1: each required check maps to the action that proves it. The list comes
    // from configuration, the mapping lives here because it is a contract detail.
    const required = asStringArray(config['bp_required_checks']);
    const checked = {
      drawer: isCompleted(firstByAction(events, 'drawer_opened')),
      cuff: isCompleted(firstByAction(events, 'cuff_selected')),
    };
    if (!required || required.length === 0) {
      out.m1 = notEvaluable('bp_required_checks not configured');
    } else {
      const done = required.filter((check) => checked[check as keyof typeof checked] === true).length;
      out.m1 = ratio(done, required.length);
    }

    // M2: the cuff chosen against the one the case expects.
    const expectedCuff = caseParam(caseCriteria, 'correct_cuff');
    const chosen = valueAsString(firstByAction(events, 'cuff_selected'));
    if (expectedCuff === undefined) {
      out.m2 = notEvaluable('case has no correct_cuff');
    } else if (chosen === undefined) {
      out.m2 = notEvaluable('no cuff selected');
    } else {
      out.m2 = { kind: 'boolean', value: chosen === expectedCuff };
    }

    // M3: what the participant wrote against what the device displayed.
    const displayed = valueAsString(firstByAction(events, 'reading_displayed'));
    const written = valueAsString(
      events.filter((e) => e.action === 'value_recorded' && e.object === 'field_bp').at(-1),
    );
    if (displayed === undefined) {
      out.m3 = notEvaluable('no reading displayed');
    } else if (written === undefined) {
      out.m3 = notEvaluable('no reading recorded');
    } else {
      out.m3 = { kind: 'boolean', value: displayed === written };
    }

    return out;
  },
};

/**
 * 3. Revisión del pulso
 * M1 Revisión realizada: sí/no
 * M2 Concordancia entre valor mostrado y registrado
 * M3 Corrección del valor antes de confirmar: sí/no
 */
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

    const wristCounts =
      isCompleted(wrist) && (validSources === undefined || validSources.includes('wrist'));
    const monitorCounts =
      isCompleted(monitor) && (validSources === undefined || validSources.includes('monitor'));

    out.m1 = { kind: 'boolean', value: wristCounts || monitorCounts };

    const recorded = events
      .filter((e) => e.action === 'value_recorded' && e.object === 'field_pulse')
      .at(-1);
    const written = asNumber(recorded?.value);
    const displayed = asNumber(monitor?.value);

    if (displayed === undefined || written === undefined) {
      out.m2 = notEvaluable('missing displayed or recorded pulse');
    } else {
      out.m2 = { kind: 'boolean', value: displayed === written };
    }

    out.m3 = { kind: 'boolean', value: events.some((e) => e.outcome === 'corrected') };

    return out;
  },
};

/**
 * 4. Integración y registro de los tres signos
 * M1 Signos correctamente registrados / tres signos previstos
 * M2 Campos omitidos
 * M3 Discordancias entre lecturas y ficha final
 */
export const vitalsIntegration: IndicatorDefinition = {
  id: 'vitals_integration',
  procedure: 'vitals_integration',
  scene: 'vital_signs',
  names: { m1: 'correct_vitals_of_three', m2: 'omitted_fields', m3: 'chart_discrepancies' },
  evaluate: ({ sessionEvents, caseCriteria }) => {
    const out: Partial<Record<'m1' | 'm2' | 'm3', MetricValue>> = {};

    const expected = caseParam(caseCriteria, 'vitals_key');
    // The three values are recorded inside their own procedures, so this
    // indicator reads the whole session rather than its own slice.
    const recorded = sessionEvents.filter(
      (e) => e.action === 'value_recorded' && e.object?.startsWith('field_'),
    );
    const byField = new Map(recorded.map((e) => [e.object ?? '', e]));

    const rr = asNumber(byField.get('field_rr')?.value);
    const bp = valueAsString(byField.get('field_bp'));
    const pulseValue = asNumber(byField.get('field_pulse')?.value);

    if (!expected) {
      out.m1 = notEvaluable('case has no vitals_key');
      out.m3 = notEvaluable('case has no vitals_key');
    } else {
      let correct = 0;
      let discrepancies = 0;
      if (rr !== undefined) {
        if (rr === expected.respiratory_rate) correct++;
        else discrepancies++;
      }
      if (bp !== undefined) {
        if (bp === expected.blood_pressure) correct++;
        else discrepancies++;
      }
      if (pulseValue !== undefined) {
        if (pulseValue === expected.pulse) correct++;
        else discrepancies++;
      }
      out.m1 = ratio(correct, 3);
      out.m3 = { kind: 'number', value: discrepancies };
    }

    const expectedFields = ['field_rr', 'field_bp', 'field_pulse'];
    out.m2 = { kind: 'number', value: expectedFields.filter((f) => !byField.has(f)).length };

    return out;
  },
};
