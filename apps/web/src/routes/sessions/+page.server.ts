import { cases, sessions } from '@sc/db';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db.ts';

export function load({ url }: { url: URL }) {
  const db = getDb();
  const participant = url.searchParams.get('participant') ?? undefined;
  const status = url.searchParams.get('status') ?? undefined;

  const conditions = [
    participant ? eq(sessions.participantCode, participant) : undefined,
    status ? eq(sessions.status, status) : undefined,
  ].filter((condition) => condition !== undefined);

  const rows = db
    .select({
      id: sessions.id,
      participantCode: sessions.participantCode,
      phase: sessions.phase,
      caseId: sessions.caseId,
      caseLabel: cases.label,
      status: sessions.status,
      startedAt: sessions.startedAt,
      durationMs: sessions.durationMs,
      eventCount: sessions.eventCount,
      invalidEventCount: sessions.invalidEventCount,
    })
    .from(sessions)
    .leftJoin(cases, eq(sessions.caseId, cases.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sessions.startedAt))
    .all();

  return { sessions: rows, filter: { participant: participant ?? '', status: status ?? '' } };
}
