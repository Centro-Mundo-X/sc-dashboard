import http from 'node:http';
import https from 'node:https';
import { redirect, type RequestEvent } from '@sveltejs/kit';

/** Routes reachable without a session. */
const PUBLIC_ROUTES = ['/login'];

/** API behind this server. Everything under `/api` is forwarded there. */
const API_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';

/**
 * Protocol the API should assume for the request that leaves this process.
 *
 * `https` unless configured otherwise: in production the API marks the session
 * cookie `Secure` and drops it on a connection it believes is insecure.
 */
const FORWARDED_PROTO = process.env.API_FORWARDED_PROTO === 'http' ? 'http' : 'https';

/** Hop-by-hop headers, which must not be forwarded. */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

/**
 * Forwards a request to the API and returns its response unchanged.
 *
 * `node:http` rather than `fetch`: undici collapses repeated `Set-Cookie`
 * headers into one, and the login answers with two.
 */
async function forward(event: RequestEvent): Promise<Response> {
  const { request, url } = event;
  const target = new URL(API_BASE);
  const secure = target.protocol === 'https:';
  const client = secure ? https : http;

  const headers: Record<string, string | string[]> = {};
  for (const [name, value] of request.headers) {
    if (!HOP_BY_HOP.has(name)) headers[name] = value;
  }
  headers['x-forwarded-proto'] = FORWARDED_PROTO;
  headers['x-forwarded-host'] = request.headers.get('host') ?? url.host;
  headers['x-forwarded-for'] = event.getClientAddress();

  let body: Buffer | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = Buffer.from(await request.arrayBuffer());
    headers['content-length'] = String(body.length);
  }

  return new Promise((resolve, reject) => {
    const outgoing = client.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (secure ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: request.method,
        headers,
      },
      (response) => {
        const responseHeaders = new Headers();
        for (let i = 0; i < response.rawHeaders.length; i += 2) {
          const name = response.rawHeaders[i];
          const value = response.rawHeaders[i + 1];
          if (!name || value === undefined || HOP_BY_HOP.has(name.toLowerCase())) continue;
          // `append` keeps repeated Set-Cookie headers separate.
          responseHeaders.append(name, value);
        }

        // The body is streamed, so undici needs `duplex` spelled out.
        resolve(
          new Response(response as unknown as ReadableStream, {
            status: response.statusCode ?? 502,
            headers: responseHeaders,
            // @ts-expect-error `duplex` is required for a stream body and missing from the DOM types.
            duplex: 'half',
          }),
        );
      },
    );

    outgoing.setTimeout(30_000, () => outgoing.destroy(new Error('the API did not answer in time')));
    outgoing.on('error', reject);
    outgoing.end(body);
  });
}

/**
 * Sits in front of both the dashboard and the API.
 *
 * `/api/*` goes to the API process; everything else is a dashboard page, and
 * only a request with a session cookie gets past the redirect.
 */
export async function handle({
  event,
  resolve,
}: {
  event: RequestEvent;
  resolve: (event: RequestEvent) => Promise<Response>;
}): Promise<Response> {
  if (event.url.pathname.startsWith('/api/')) {
    return forward(event).catch((error: unknown) => {
      console.error('api proxy failed', error);
      return new Response('bad gateway', { status: 502 });
    });
  }

  const isPublic = PUBLIC_ROUTES.some((route) => event.url.pathname.startsWith(route));
  if (!isPublic && !event.cookies.get('sc_user')) {
    throw redirect(303, '/login');
  }
  return resolve(event);
}
