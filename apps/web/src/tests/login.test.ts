import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';

/** Runs the login action against a stub API and checks what the browser receives. */

let server: Server;
let received: string[] = [];

/** Both cookies the real API sends. */
const SET_COOKIES = [
  'sc_user=demo; Max-Age=28800; Path=/; HttpOnly; SameSite=Lax',
  'sc_session=abc.def@ghi+/sig; Max-Age=28800; Path=/; HttpOnly; SameSite=Lax',
];

before(async () => {
  server = createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      received = [String(request.headers['x-forwarded-proto']), body];

      if (body.includes('wrong')) {
        response.writeHead(401).end('{"error":"invalid credentials"}');
        return;
      }

      response.writeHead(200, { 'content-type': 'application/json', 'set-cookie': SET_COOKIES });
      response.end('{"username":"demo"}');
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.API_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
});

/** Stand-in for SvelteKit's `cookies`. */
function fakeCookies() {
  const set = new Map<string, string>();
  return {
    set: (name: string, value: string) => {
      set.set(name, value);
    },
    read: (name: string) => set.get(name),
    size: () => set.size,
  };
}

async function callLogin(username: string, password: string) {
  const { actions } = await import('../routes/login/+page.server.ts');
  const form = new FormData();
  form.set('username', username);
  form.set('password', password);

  const cookies = fakeCookies();
  const event = { request: { formData: async () => form }, cookies };

  try {
    return { result: await actions.default(event as never), cookies, redirected: true };
  } catch (thrown) {
    return { result: thrown, cookies, redirected: false };
  }
}

describe('login action', () => {
  it('forwards both cookies the API sets', async () => {
    const { cookies, redirected } = await callLogin('demo', 'demo-access-2024');

    assert.equal(redirected, false, JSON.stringify(cookies));
    assert.equal(cookies.read('sc_user'), 'demo');
    assert.equal(cookies.read('sc_session'), 'abc.def@ghi+/sig');
  });

  it('announces the protocol the API sits behind', async () => {
    await callLogin('demo', 'demo-access-2024');
    assert.equal(received[0], 'https');
    assert.match(received[1] ?? '', /demo-access-2024/);
  });

  it('sets no cookies on bad credentials', async () => {
    const { result, cookies } = await callLogin('demo', 'wrong');
    assert.equal((result as { status?: number }).status, 401);
    assert.equal(cookies.size(), 0);
  });
});
