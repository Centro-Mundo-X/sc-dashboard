import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

/** Hashes a device token so it can be compared without storing plaintext. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Guards ingestion routes with the device token shared with Unity.
 *
 * Separated from dashboard login because the headset has no user session and
 * the dashboard has no device token.
 */
export function requireDeviceToken(expectedHash: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const header = request.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      await reply.code(401).send({ error: 'missing bearer token' });
      return;
    }

    if (!safeEqual(hashToken(token), expectedHash)) {
      await reply.code(401).send({ error: 'invalid device token' });
    }
  };
}

declare module 'fastify' {
  interface Session {
    userId?: number;
    username?: string;
  }
}

/** Guards dashboard routes. Returns 401 when there is no active session. */
export async function requireUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.session.userId) {
    await reply.code(401).send({ error: 'authentication required' });
  }
}
