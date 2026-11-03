import { fail, redirect } from '@sveltejs/kit';

const API_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';

/**
 * Login posts to the API, which owns credentials and the session cookie.
 */
export const actions = {
  default: async ({ request, cookies, fetch }) => {
    const form = await request.formData();
    const username = String(form.get('username') ?? '');
    const password = String(form.get('password') ?? '');

    if (!username || !password) {
      return fail(400, { username, error: 'missing' });
    }

    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).catch(() => null);

    if (!response || !response.ok) {
      return fail(401, { username, error: 'invalid' });
    }

    // Forward the API cookies verbatim.
    //
    // `cookies.set()` encodes the value by default. The signed session cookie
    // already contains `@`, `/` and a signature ending in `+`, so encoding it a
    // second time changes the string the API signed: it fails to verify and
    // every later request comes back 401. Passing the value through unchanged
    // is the only way to keep it verifiable.
    for (const cookie of response.headers.getSetCookie?.() ?? []) {
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
