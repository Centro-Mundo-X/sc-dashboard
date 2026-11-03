import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import { loadStudyConfig, openDatabase, runMigrations, seedCases, seedStudyConfig, type Db } from '@sc/db';
import { hashToken, requireDeviceToken, requireUser } from './auth.ts';
import { ingestSession } from '../services/ingest.ts';
import { registerSessionRoutes } from '../routes/sessions.ts';
import { registerAuthRoutes } from '../routes/auth.ts';

export interface ServerOptions {
  dbPath: string;
  deviceToken: string;
  sessionSecret: string;
  /** Path to the generated Drizzle migrations. */
  migrationsFolder: string;
  sessionSecure?: boolean;
  logger?: boolean;
}

/** Default migrations location, resolved from the repo layout. */
export const defaultMigrationsFolder = new URL(
  '../../../../packages/db/migrations',
  import.meta.url,
).pathname;

export interface BuiltServer {
  app: FastifyInstance;
  db: Db;
}

const MAX_INGEST_BYTES = 2 * 1024 * 1024;

export async function buildServer(options: ServerOptions): Promise<BuiltServer> {
  const db = openDatabase(options.dbPath);

  // Schema must exist before anything reads it, including the study config
  // loaded further down.
  runMigrations(db, options.migrationsFolder);
  seedStudyConfig(db);
  seedCases(db);

  const app = Fastify({ logger: options.logger ?? true, bodyLimit: MAX_INGEST_BYTES });

  await app.register(cookie);
  await app.register(session, {
    secret: options.sessionSecret,
    cookieName: 'sc_session',
    cookie: { secure: options.sessionSecure ?? false, httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 },
    saveUninitialized: false,
  });

  // Ingestion sends raw newline-delimited JSON, not a JSON document.
  app.addContentTypeParser(
    ['application/x-ndjson', 'text/plain'],
    { parseAs: 'string' },
    (_request, body, done) => done(null, body),
  );

  const config = loadStudyConfig(db);
  const deviceGuard = requireDeviceToken(hashToken(options.deviceToken));

  // Ingestion: one session, raw ndjson body.
  app.post('/api/sessions/ingest', { preHandler: deviceGuard }, async (request, reply) => {
    const current = loadStudyConfig(db);
    const body = typeof request.body === 'string' ? request.body : '';
    if (body.trim().length === 0) {
      return reply.code(400).send({ error: 'empty body' });
    }

    const result = ingestSession(db, body, current.values, current.version, current.approved);
    if (result.status === 'rejected') {
      return reply.code(400).send({ error: result.error ?? 'invalid session' });
    }

    return reply.code(200).send({
      client_id: result.clientId,
      status: 'accepted',
      duplicate: result.duplicate,
      events_received: result.eventsReceived,
      invalid_events: result.invalidEvents,
    });
  });

  // Ingestion: several sessions, for the USB rescue path.
  app.post('/api/sessions/ingest-batch', { preHandler: deviceGuard }, async (request, reply) => {
    const current = loadStudyConfig(db);
    const payload = request.body as { sessions?: unknown } | undefined;
    const list = payload?.sessions;

    if (!Array.isArray(list)) {
      return reply.code(400).send({ error: 'expected { sessions: string[] }' });
    }

    const results = list.map((entry) => {
      if (typeof entry !== 'string') {
        return { client_id: null, status: 'rejected', error: 'entry is not a string' };
      }
      const result = ingestSession(db, entry, current.values, current.version, current.approved);
      return result.status === 'rejected'
        ? { client_id: result.clientId || null, status: 'rejected', error: result.error }
        : {
            client_id: result.clientId,
            status: 'accepted',
            duplicate: result.duplicate,
            events_received: result.eventsReceived,
            invalid_events: result.invalidEvents,
          };
    });

    return reply.code(200).send({ results });
  });

  registerAuthRoutes(app, db, requireUser);
  registerSessionRoutes(app, db, requireUser);

  void config;

  return { app, db };
}
