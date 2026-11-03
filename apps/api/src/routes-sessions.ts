import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { Db } from '@sc/db';
import { events, metricResults, sessions, studyConfig } from '@sc/db';
import { and, desc, eq, sql } from 'drizzle-orm';

interface SessionFilters {
  participant?: string;
  phase?: string;
  status?: string;
  from?: string;
  to?: string;
}

export function registerSessionRoutes(
  app: FastifyInstance,
  db: Db,
  guard: preHandlerHookHandler,
): void {
  app.get<{ Querystring: SessionFilters }>(
    '/api/sessions',
    { preHandler: guard },
    async (request) => {
      const { participant, phase, status, from, to } = request.query;

      const conditions = [
        participant ? eq(sessions.participantCode, participant) : undefined,
        phase ? eq(sessions.phase, phase) : undefined,
        status ? eq(sessions.status, status) : undefined,
        from ? sql`${sessions.startedAt} >= ${from}` : undefined,
        to ? sql`${sessions.startedAt} <= ${to}` : undefined,
      ].filter((condition) => condition !== undefined);

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = db
        .select({
          id: sessions.id,
          clientId: sessions.clientId,
          participantCode: sessions.participantCode,
          phase: sessions.phase,
          caseId: sessions.caseId,
          status: sessions.status,
          incompleteReason: sessions.incompleteReason,
          startedAt: sessions.startedAt,
          durationMs: sessions.durationMs,
          eventCount: sessions.eventCount,
          invalidEventCount: sessions.invalidEventCount,
        })
        .from(sessions)
        .where(where)
        .orderBy(desc(sessions.startedAt))
        .all();

      return { sessions: rows };
    },
  );

  app.get<{ Params: { id: string } }>(
    '/api/sessions/:id',
    { preHandler: guard },
    async (request, reply) => {
      const id = Number(request.params.id);
      if (!Number.isInteger(id)) return reply.code(400).send({ error: 'invalid id' });

      const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
      if (!session) return reply.code(404).send({ error: 'session not found' });

      const timeline = db
        .select()
        .from(events)
        .where(eq(events.sessionId, id))
        .orderBy(events.eventId)
        .all();

      return { session, events: timeline };
    },
  );

  app.get<{ Params: { id: string } }>(
    '/api/sessions/:id/metrics',
    { preHandler: guard },
    async (request, reply) => {
      const id = Number(request.params.id);
      if (!Number.isInteger(id)) return reply.code(400).send({ error: 'invalid id' });

      const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
      if (!session) return reply.code(404).send({ error: 'session not found' });

      const rows = db
        .select()
        .from(metricResults)
        .where(eq(metricResults.sessionId, id))
        .orderBy(metricResults.indicator, metricResults.metric)
        .all();

      const pending = db
        .select({ key: studyConfig.key })
        .from(studyConfig)
        .where(eq(studyConfig.approved, false))
        .all()
        .map((row) => row.key);

      return {
        sessionId: id,
        metrics: rows,
        configApproved: pending.length === 0,
        pendingConfigKeys: pending,
      };
    },
  );

  app.patch<{ Params: { id: string }; Body: { reason?: string } }>(
    '/api/sessions/:id/incomplete-reason',
    { preHandler: guard },
    async (request, reply) => {
      const id = Number(request.params.id);
      if (!Number.isInteger(id)) return reply.code(400).send({ error: 'invalid id' });

      const reason = request.body?.reason;
      if (typeof reason !== 'string' || reason.length === 0) {
        return reply.code(400).send({ error: 'expected { reason: string }' });
      }

      const updated = db
        .update(sessions)
        .set({ incompleteReason: reason })
        .where(eq(sessions.id, id))
        .run();

      if (updated.changes === 0) return reply.code(404).send({ error: 'session not found' });
      return { id, incompleteReason: reason };
    },
  );
}
