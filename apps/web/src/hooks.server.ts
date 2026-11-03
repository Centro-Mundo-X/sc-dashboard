import { redirect } from '@sveltejs/kit';

/** Routes reachable without a session. */
const PUBLIC_ROUTES = ['/login'];

interface HookEvent {
  url: URL;
  cookies: { get(name: string): string | undefined };
}

/**
 * Session check for the dashboard.
 *
 * The cookie is issued by the API after login. The API stays the authority on
 * every data request; this only keeps anonymous visitors off the pages.
 */
export async function handle({
  event,
  resolve,
}: {
  event: HookEvent;
  resolve: (event: HookEvent) => Promise<Response>;
}): Promise<Response> {
  const isPublic = PUBLIC_ROUTES.some((route) => event.url.pathname.startsWith(route));
  if (!isPublic && !event.cookies.get('sc_user')) {
    throw redirect(303, '/login');
  }
  return resolve(event);
}
