import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parseSessionJsonl } from './parse.ts';

const fixturePath = new URL('../../../fixtures/session-complete.jsonl', import.meta.url);
const fixture = readFileSync(fixturePath, 'utf8');

describe('parseSessionJsonl', () => {
  it('parses the complete fixture', () => {
    const result = parseSessionJsonl(fixture);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.session.header.participant_code, 'P01');
    assert.equal(result.session.header.phase, 'single');
    assert.equal(result.session.events.length, 38);
    assert.equal(result.invalidEvents.length, 0);
    assert.equal(result.warnings.length, 0);
    assert.equal(result.session.close?.total_events, 38);
    assert.deepEqual(result.session.close?.scenes_completed, [
      'vital_signs',
      'x_ray',
      'results_delivery',
    ]);
  });

  it('keeps event ids contiguous', () => {
    const result = parseSessionJsonl(fixture);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const ids = result.session.events.map((e) => e.event_id);
    assert.deepEqual(ids, Array.from({ length: 38 }, (_, i) => i + 1));
  });

  it('rejects a file without a header', () => {
    const result = parseSessionJsonl('{"type":"event","event_id":1}');
    assert.equal(result.ok, false);
  });

  it('rejects an invalid header', () => {
    const bad = JSON.stringify({ type: 'session', contract_version: '1.0' });
    const result = parseSessionJsonl(bad);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /Invalid header/);
  });

  it('quarantines invalid events without losing the session', () => {
    const lines = fixture.trim().split('\n');
    const header = lines[0]!;
    const brokenEvent = '{"type":"event","event_id":"not-a-number"}';
    const result = parseSessionJsonl([header, brokenEvent].join('\n'));

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.session.events.length, 0);
    assert.equal(result.invalidEvents.length, 1);
    assert.equal(result.invalidEvents[0]!.line, 2);
  });

  it('treats a session without close as valid', () => {
    const lines = fixture.trim().split('\n').slice(0, -1);
    const result = parseSessionJsonl(lines.join('\n'));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.session.close, null);
  });

  it('ignores an unknown line type with a warning', () => {
    const lines = fixture.trim().split('\n');
    const withUnknown = [...lines.slice(0, 1), '{"type":"telemetry","x":1}', ...lines.slice(1)];
    const result = parseSessionJsonl(withUnknown.join('\n'));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0]!, /unknown type/);
  });
});
