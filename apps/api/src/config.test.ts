import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { parseOrigin, parseTrustProxy } from './config.ts';
import { buildServer, type BuiltServer } from './http/server.ts';
import { createUser } from './services/users.ts';

describe('parseTrustProxy', () => {
  it('trusts nobody by default', () => {
    assert.equal(parseTrustProxy(undefined), false);
    assert.equal(parseTrustProxy(''), false);
    assert.equal(parseTrustProxy('false'), false);
  });

  it('accepts true, hops, addresses and ranges', () => {
    assert.equal(parseTrustProxy('true'), true);
    assert.equal(parseTrustProxy('2'), '2');
    assert.deepEqual(parseTrustProxy('127.0.0.1, 10.0.0.0/8'), ['127.0.0.1', '10.0.0.0/8']);
    assert.deepEqual(parseTrustProxy('::1'), ['::1']);
    assert.deepEqual(parseTrustProxy('loopback'), ['loopback']);
  });

  it('rejects what it cannot apply', () => {
    assert.throws(() => parseTrustProxy('0'), /1 or more/);
    assert.throws(() => parseTrustProxy('yes'), /not an address/);
    assert.throws(() => parseTrustProxy('10.0.0.0/33'), /10\.0\.0\.0\/33/);
    assert.throws(() => parseTrustProxy('a,b'), /a, b/);
  });
});

describe('parseOrigin', () => {
  it('is optional outside production', () => {
    assert.equal(parseOrigin(undefined, false), undefined);
  });

  it('is required in production', () => {
    assert.throws(() => parseOrigin(undefined, true), /ORIGIN is required/);
  });

  it('normalises and validates the value', () => {
    assert.equal(parseOrigin('https://sc.example.com/', true), 'https://sc.example.com');
    assert.equal(parseOrigin('https://sc.example.com/x', true), 'https://sc.example.com');
    assert.throws(() => parseOrigin('sc.example.com', true), /not a valid URL/);
    assert.throws(() => parseOrigin('ftp://sc.example.com', true), /http or https/);
  });
});

describe('session cookie behind a TLS proxy', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sc-proxy-'));
  const migrationsFolder = new URL('../../../packages/db/migrations', import.meta.url).pathname;
  const servers: BuiltServer[] = [];

  async function start(trustProxy: boolean | string[]) {
    const built = await buildServer({
      dbPath: join(dir, `proxy-${servers.length}.sqlite`),
      deviceToken: 'test-device-token',
      sessionSecret: 'x'.repeat(40),
      migrationsFolder,
      sessionSecure: true,
      trustProxy,
      logger: false,
    });
    await createUser(built.db, { username: 'demo', password: 'demo-access-2024', displayName: 'Demo' });
    await built.app.ready();
    servers.push(built);
    return built;
  }

  function login(built: BuiltServer) {
    return built.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'x-forwarded-proto': 'https' },
      payload: { username: 'demo', password: 'demo-access-2024' },
    });
  }

  after(async () => {
    await Promise.all(servers.map((built) => built.app.close()));
    rmSync(dir, { recursive: true, force: true });
  });

  it('keeps the session when the proxy is trusted', async () => {
    const response = await login(await start(['127.0.0.1']));
    assert.equal(response.statusCode, 200);
    assert.ok(response.cookies.some((cookie) => cookie.name === 'sc_session'));
  });

  it('drops the session when no proxy is trusted', async () => {
    const response = await login(await start(false));
    assert.equal(response.statusCode, 200);
    assert.ok(!response.cookies.some((cookie) => cookie.name === 'sc_session'));
  });
});
