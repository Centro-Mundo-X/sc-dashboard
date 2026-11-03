import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { Db } from '@sc/db';
import { verifyCredentials } from '../services/users.ts';

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

/** Dashboard login. The cookie is what the web app checks on every request. */
export function registerAuthRoutes(app: FastifyInstance, db: Db, guard: preHandlerHookHandler): void {
  app.post<{ Body: LoginBody }>('/api/auth/login', async (request, reply) => {
    const { username, password } = request.body ?? {};

    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return reply.code(400).send({ error: 'username and password are required' });
    }

    const user = await verifyCredentials(db, username, password);
    if (!user) {
      return reply.code(401).send({ error: 'invalid credentials' });
    }

    request.session.userId = user.id;
    request.session.username = user.username;

    // Mirror the session into a cookie the SvelteKit app can see. It carries no
    // secret; the API remains the authority on every data request.
    reply.setCookie('sc_user', user.username, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
    });

    return { username: user.username };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    request.session.destroy();
    reply.clearCookie('sc_user', { path: '/' });
    return { status: 'logged out' };
  });

  app.get('/api/auth/me', { preHandler: guard }, async (request) => ({
    userId: request.session.userId,
    username: request.session.username,
  }));
}
