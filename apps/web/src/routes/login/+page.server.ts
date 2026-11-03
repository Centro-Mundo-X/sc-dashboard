import { fail, redirect } from '@sveltejs/kit';

const API_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';

/** Login posts to the API, which owns credentials and the session cookie. */
export const actions = {
  default: async ({ request, cookies, fetch }: {
    request: Request;
    cookies: { set(name: string, value: string, opts: Record<string, unknown>): void };
    fetch: typeof globalThis.fetch;
  }) => {
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

    // Forward the API session cookies to the browser.
    for (const cookie of response.headers.getSetCookie?.() ?? []) {
      const [pair] = cookie.split(';');
      const index = pair?.indexOf('=') ?? -1;
      if (!pair || index < 1) continue;
      cookies.set(pair.slice(0, index), pair.slice(index + 1), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 8 * 60 * 60,
      });
    }

    throw redirect(303, '/sessions');
  },
};
