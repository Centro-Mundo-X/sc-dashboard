import { events as eventsTable, metricResults, sessions, studyConfig } from '@sc/db';
import { asc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getDb } from '#lib/server/db.ts';

export function load({ params }: { params: { id: string } }) {
  const db = getDb();
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw error(404, 'Sesión no encontrada');

  const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) throw error(404, 'Sesión no encontrada');

  const timeline = db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.sessionId, id))
    .orderBy(asc(eventsTable.eventId))
    .all();

  const metrics = db
    .select()
    .from(metricResults)
    .where(eq(metricResults.sessionId, id))
    .orderBy(asc(metricResults.indicator), asc(metricResults.metric))
    .all();

  const pendingKeys = db
    .select({ key: studyConfig.key })
    .from(studyConfig)
    .where(eq(studyConfig.approved, false))
    .all()
    .map((row: { key: string }) => row.key);

  return {
    session,
    events: timeline,
    metrics,
    configApproved: pendingKeys.length === 0,
    pendingKeys,
  };
}
