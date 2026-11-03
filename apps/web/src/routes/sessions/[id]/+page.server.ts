import type { CaseCriteria } from '@sc/shared';
import { missingCriteria } from '@sc/shared';
import { events as eventsTable, findCase, metricResults, sessions, studyConfig } from '@sc/db';
import { asc, eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { getDb } from '#lib/server/db.ts';

const API_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';

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

  const caseRow = findCase(db, session.caseId);
  const missing = missingCriteria((caseRow?.criteria ?? null) as CaseCriteria | null);

  return {
    session,
    events: timeline,
    metrics,
    configApproved: pendingKeys.length === 0,
    pendingKeys,
    caseLabel: caseRow?.label ?? null,
    caseMissing: missing,
    caseApproved: caseRow?.approved ?? false,
  };
}

/**
 * Saving the incomplete reason goes through the API, which owns the session
 * record. A form action rather than a client fetch: the browser never needs to
 * know where the API lives, and SvelteKit re-renders the page with the stored
 * value afterwards.
 */
export const actions = {
  reason: async ({ request, params, fetch }: {
    request: Request;
    params: { id: string };
    fetch: typeof globalThis.fetch;
  }) => {
    const form = await request.formData();
    const reason = String(form.get('reason') ?? '').trim();

    if (!reason) return fail(400, { reason, error: 'empty' });

    // Forward the browser's cookies as they are. The API authenticates on its
    // own `sc_session` cookie, which this app never reads or parses.
    const browserCookies = request.headers.get('cookie');
    const response = await fetch(`${API_BASE}/api/sessions/${params.id}/incomplete-reason`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...(browserCookies ? { cookie: browserCookies } : {}),
      },
      body: JSON.stringify({ reason }),
    }).catch(() => null);

    if (!response || !response.ok) return fail(response?.status ?? 502, { reason, error: 'api' });

    return { reason };
  },
};
