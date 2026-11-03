import { redirect } from '@sveltejs/kit';

/**
 * There is no landing page: the dashboard starts at the session list. The
 * redirect lives in a `load`, so no page component is needed and nothing can
 * flash before the browser reaches `/sessions`.
 */
export function load() {
  throw redirect(307, '/sessions');
}
