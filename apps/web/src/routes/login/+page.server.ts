import http from 'node:http';
import { fail, redirect } from '@sveltejs/kit';

const API_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';

/** Protocol the API should assume for this call. */
const FORWARDED_PROTO = process.env.API_FORWARDED_PROTO === 'http' ? 'http' : 'https';

/**
 * Posts the credentials and returns every `Set-Cookie`.
 *
 * `fetch` cannot be used: undici collapses the API's two `Set-Cookie` headers
 * into one, so `sc_session` is lost. `rawHeaders` keeps them apart.
 */
function postLogin(username: string, password: string): Promise<{ ok: boolean; cookies: string[] }> {
  const body = JSON.stringify({ username, password });
  const url = new URL(`${API_BASE}/api/auth/login`);

  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
          // This hop is plain HTTP; without it the API drops the `Secure` cookie.
          // Ignored unless this address is in the API's TRUST_PROXY.
          'x-forwarded-proto': FORWARDED_PROTO,
        },
      },
      (response) => {
        const cookies: string[] = [];
        for (let i = 0; i < response.rawHeaders.length; i += 2) {
          if (response.rawHeaders[i]?.toLowerCase() === 'set-cookie') {
            const value = response.rawHeaders[i + 1];
            if (value) cookies.push(value);
          }
        }
        const status = response.statusCode ?? 500;
        response.resume();
        response.on('end', () => resolve({ ok: status >= 200 && status < 300, cookies }));
        response.on('error', reject);
      },
    );

    request.setTimeout(10_000, () => request.destroy(new Error('the API did not answer in time')));
    request.on('error', reject);
    request.end(body);
  });
}

/**
 * Login posts to the API, which owns credentials and the session cookie.
 */
export const actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const username = String(form.get('username') ?? '');
    const password = String(form.get('password') ?? '');

    if (!username || !password) {
      return fail(400, { username, error: 'missing' });
    }

    const result = await postLogin(username, password).catch(() => null);
    if (!result?.ok) {
      return fail(401, { username, error: 'invalid' });
    }

    // Forward the API cookies verbatim.
    //
    // `cookies.set()` encodes the value by default. The signed session cookie
    // already contains `@`, `/` and a signature ending in `+`, so encoding it a
    // second time changes the string the API signed: it fails to verify and
    // every later request comes back 401. Passing the value through unchanged
    // is the only way to keep it verifiable.
    for (const cookie of result.cookies) {
      const [pair] = cookie.split(';');
      const index = pair?.indexOf('=') ?? -1;
      if (!pair || index < 1) continue;

      cookies.set(pair.slice(0, index), pair.slice(index + 1), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 8 * 60 * 60,
        encode: (value: string) => value,
      });
    }

    throw redirect(303, '/sessions');
  },
};
