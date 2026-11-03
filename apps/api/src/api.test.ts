import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { buildServer, type BuiltServer } from './server.ts';

const dir = mkdtempSync(join(tmpdir(), 'sc-api-'));
const dbPath = join(dir, 'api.sqlite');
const migrationsFolder = new URL('../../../packages/db/migrations', import.meta.url).pathname;
const fixture = readFileSync(
  new URL('../../../fixtures/session-complete.jsonl', import.meta.url),
  'utf8',
);

const DEVICE_TOKEN = 'test-device-token';
let built: BuiltServer;

before(async () => {
  built = await buildServer({
    dbPath,
    deviceToken: DEVICE_TOKEN,
    sessionSecret: 'x'.repeat(40),
    migrationsFolder,
    logger: false,
  });
  const { app } = built;
  await app.ready();
});

after(async () => {
  await built.app.close();
  rmSync(dir, { recursive: true, force: true });
});

function ingest(body: string, token = DEVICE_TOKEN) {
  return built.app.inject({
    method: 'POST',
    url: '/api/sessions/ingest',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/x-ndjson',
    },
    payload: body,
  });
}

describe('POST /api/sessions/ingest', () => {
  it('rejects a missing token', async () => {
    const response = await built.app.inject({
      method: 'POST',
      url: '/api/sessions/ingest',
      headers: { 'content-type': 'application/x-ndjson' },
      payload: fixture,
    });
    assert.equal(response.statusCode, 401);
  });

  it('rejects a wrong token', async () => {
    const response = await ingest(fixture, 'nope');
    assert.equal(response.statusCode, 401);
  });

  it('accepts a valid session and computes metrics', async () => {
    const response = await ingest(fixture);
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.status, 'accepted');
    assert.equal(body.duplicate, false);
    assert.equal(body.events_received, 43);
  });

  it('is idempotent on replay', async () => {
    const response = await ingest(fixture);
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().duplicate, true);
  });

  it('rejects a body without a header', async () => {
    const response = await ingest('{"type":"event","event_id":1}');
    assert.equal(response.statusCode, 400);
  });

  it('rejects an empty body', async () => {
    const response = await ingest('');
    assert.equal(response.statusCode, 400);
  });

  it('accepts a batch and reports each entry', async () => {
    const response = await built.app.inject({
      method: 'POST',
      url: '/api/sessions/ingest-batch',
      headers: { authorization: `Bearer ${DEVICE_TOKEN}` },
      payload: { sessions: [fixture, 'garbage'] },
    });
    assert.equal(response.statusCode, 200);
    const results = response.json().results;
    assert.equal(results.length, 2);
    assert.equal(results[0].status, 'accepted');
    assert.equal(results[1].status, 'rejected');
  });
});

describe('dashboard routes', () => {
  it('requires authentication', async () => {
    const response = await built.app.inject({ method: 'GET', url: '/api/sessions' });
    assert.equal(response.statusCode, 401);
  });
});
