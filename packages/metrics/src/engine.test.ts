import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parseSessionJsonl } from '@sc/shared';
import { STUDY_CONFIG } from './test-config.ts';
import { evaluateSession, INDICATORS } from './engine.ts';

const fixture = readFileSync(
  new URL('../../../fixtures/session-complete.jsonl', import.meta.url),
  'utf8',
);

function fixtureSession() {
  const parsed = parseSessionJsonl(fixture);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error('fixture must parse');
  return parsed.session;
}

function metricOf(results: ReturnType<typeof evaluateSession>, indicator: string, name: string) {
  const found = results.results
    .find((r) => r.indicator === indicator)
    ?.metrics.find((m) => m.name === name);
  assert.ok(found, `missing metric ${indicator}.${name}`);
  return found.value;
}

describe('evaluateSession', () => {
  it('evaluates every indicator', () => {
    const result = evaluateSession({ session: fixtureSession(), config: STUDY_CONFIG });
    assert.equal(result.results.length, INDICATORS.length);
  });

  it('reads the breathing observation from the chest gaze', () => {
    const result = evaluateSession({ session: fixtureSession(), config: STUDY_CONFIG });
    const m1 = metricOf(result, 'breathing', 'observation_completed');
    assert.deepEqual(m1, { kind: 'boolean', value: true });
  });

  it('matches the respiratory rate against the case key', () => {
    const result = evaluateSession({ session: fixtureSession(), config: STUDY_CONFIG });
    assert.deepEqual(metricOf(result, 'breathing', 'matches_key'), { kind: 'boolean', value: true });
  });

  it('measures time from observation to record', () => {
    const result = evaluateSession({ session: fixtureSession(), config: STUDY_CONFIG });
    const m3 = metricOf(result, 'breathing', 'time_to_record_ms');
    assert.equal(m3.kind, 'number');
    // 14:32:31.200 -> 14:33:02.300
    assert.equal(m3.kind === 'number' ? m3.value : -1, 31100);
  });

  it('flags the wrong cuff', () => {
    const result = evaluateSession({ session: fixtureSession(), config: STUDY_CONFIG });
    assert.deepEqual(metricOf(result, 'bp_preparation', 'cuff_matches'), { kind: 'boolean', value: false });
  });

  it('reports no pulse correction when none happened', () => {
    // The fixture corrects the cuff, not the pulse, so M3 is false here.
    const result = evaluateSession({ session: fixtureSession(), config: STUDY_CONFIG });
    assert.deepEqual(metricOf(result, 'pulse', 'corrected_before_confirm'), { kind: 'boolean', value: false });
  });

  it('detects a pulse correction inside its own procedure', () => {
    const session = fixtureSession();
    session.events = session.events.map((event) =>
      event.action === 'value_recorded' && event.object === 'field_pulse'
        ? { ...event, outcome: 'corrected' as const }
        : event,
    );
    const result = evaluateSession({ session, config: STUDY_CONFIG });
    assert.deepEqual(metricOf(result, 'pulse', 'corrected_before_confirm'), { kind: 'boolean', value: true });
  });

  it('marks an omitted instruction as a ratio below one', () => {
    const result = evaluateSession({ session: fixtureSession(), config: STUDY_CONFIG });
    const m1 = metricOf(result, 'patient_preparation', 'instructions_ratio');
    assert.equal(m1.kind, 'ratio');
    if (m1.kind !== 'ratio') return;
    assert.equal(m1.numerator, 1);
    assert.equal(m1.denominator, 2);
  });

  it('counts the study selection against the request', () => {
    const result = evaluateSession({ session: fixtureSession(), config: STUDY_CONFIG });
    assert.deepEqual(metricOf(result, 'identity_verification', 'study_matches_request'), {
      kind: 'boolean',
      value: true,
    });
  });

  it('returns not_evaluable when a parameter is missing', () => {
    const config = { ...STUDY_CONFIG } as Record<string, unknown>;
    delete config['min_gaze_ms'];
    const result = evaluateSession({ session: fixtureSession(), config });
    const m1 = metricOf(result, 'breathing', 'observation_completed');
    assert.equal(m1.kind, 'not_evaluable');
  });

  it('never returns a silent false for missing data', () => {
    const result = evaluateSession({ session: fixtureSession(), config: {} });
    assert.equal(result.complete, false);
    assert.ok(result.notEvaluableCount > 0);
  });

  it('is deterministic', () => {
    const a = evaluateSession({ session: fixtureSession(), config: STUDY_CONFIG });
    const b = evaluateSession({ session: fixtureSession(), config: STUDY_CONFIG });
    assert.deepEqual(a, b);
  });
});
