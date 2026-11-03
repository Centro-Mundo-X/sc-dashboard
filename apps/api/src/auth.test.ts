import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { createUser } from './users.ts';
import { buildServer, type BuiltServer } from './server.ts';

const dir = mkdtempSync(join(tmpdir(), 'sc-auth-'));
const dbPath = join(dir, 'auth.sqlite');
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
  await createUser(built.db, {
    username: 'psicologa',
    password: 'clave-de-prueba',
    displayName: 'Psicóloga',
  });
  await built.app.ready();
});

after(async () => {
  await built.app.close();
  rmSync(dir, { recursive: true, force: true });
});

function login(username: string, password: string) {
  return built.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username, password },
  });
}

describe('authentication', () => {
  it('rejects a wrong password', async () => {
    const response = await login('psicologa', 'incorrecta');
    assert.equal(response.statusCode, 401);
  });

  it('rejects an unknown user', async () => {
    const response = await login('nadie', 'clave-de-prueba');
    assert.equal(response.statusCode, 401);
  });

  it('rejects a malformed body', async () => {
    const response = await built.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'psicologa' },
    });
    assert.equal(response.statusCode, 400);
  });

  it('accepts valid credentials and sets the dashboard cookie', async () => {
    const response = await login('psicologa', 'clave-de-prueba');
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().username, 'psicologa');

    const cookies = response.cookies.map((c) => c.name);
    assert.ok(cookies.includes('sc_user'));
    assert.ok(cookies.includes('sc_session'));
  });

  it('grants access to session routes once logged in', async () => {
    const auth = await login('psicologa', 'clave-de-prueba');
    const cookie = auth.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await built.app.inject({
      method: 'GET',
      url: '/api/sessions',
      headers: { cookie },
    });
    assert.equal(response.statusCode, 200);
  });

  it('does not expose the password hash', async () => {
    const response = await login('psicologa', 'clave-de-prueba');
    assert.equal(response.body.includes('argon2'), false);
  });
});

describe('recalculate', () => {
  it('recomputes metrics for a stored session', async () => {
    const ingest = await built.app.inject({
      method: 'POST',
      url: '/api/sessions/ingest',
      headers: {
        authorization: `Bearer ${DEVICE_TOKEN}`,
        'content-type': 'application/x-ndjson',
      },
      payload: fixture,
    });
    assert.equal(ingest.statusCode, 200);

    const auth = await login('psicologa', 'clave-de-prueba');
    const cookie = auth.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await built.app.inject({
      method: 'POST',
      url: '/api/sessions/1/recalculate',
      headers: { cookie },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.sessionId, 1);
    assert.ok(body.metricsWritten > 0);
    assert.equal(body.notEvaluable, 0);
  });

  it('returns 404 for an unknown session', async () => {
    const auth = await login('psicologa', 'clave-de-prueba');
    const cookie = auth.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await built.app.inject({
      method: 'POST',
      url: '/api/sessions/999/recalculate',
      headers: { cookie },
    });
    assert.equal(response.statusCode, 404);
  });
});
