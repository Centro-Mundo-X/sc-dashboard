import type { Db } from '@sc/db';
import { events, invalidEvents, metricResults, participants, sessions } from '@sc/db';
import { evaluateSession } from '@sc/metrics';
import { parseSessionJsonl, SCENES, type Session } from '@sc/shared';
import { eq } from 'drizzle-orm';

export interface IngestResult {
  clientId: string;
  status: 'accepted' | 'rejected';
  duplicate: boolean;
  eventsReceived: number;
  invalidEvents: number;
  error?: string;
}

function sessionStatus(session: Session): 'complete' | 'incomplete' {
  const completed = new Set(session.close?.scenes_completed ?? []);
  return SCENES.every((scene) => completed.has(scene)) ? 'complete' : 'incomplete';
}

/**
 * Stores one session with its events and metrics.
 *
 * Idempotent by `client_id`: a replay returns `duplicate: true` without writing
 * anything. Everything else that fails during validation degrades the session
 * rather than rejecting it, because a session is a real observation that cost a
 * participant's time.
 */
export function ingestSession(db: Db, text: string, config: Record<string, unknown>, configVersion: number, configApproved: boolean): IngestResult {
  const parsed = parseSessionJsonl(text);

  if (!parsed.ok) {
    return {
      clientId: '',
      status: 'rejected',
      duplicate: false,
      eventsReceived: 0,
      invalidEvents: 0,
      error: parsed.line ? `line ${parsed.line}: ${parsed.reason}` : parsed.reason,
    };
  }

  const { session, invalidEvents: rejectedEvents } = parsed;
  const header = session.header;

  const existing = db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.clientId, header.client_id))
    .get();

  if (existing) {
    return {
      clientId: header.client_id,
      status: 'accepted',
      duplicate: true,
      eventsReceived: session.events.length,
      invalidEvents: rejectedEvents.length,
    };
  }

  const status = sessionStatus(session);
  const incompleteReason =
    status === 'incomplete' ? (session.close?.incomplete_reason ?? 'unknown') : null;

  const stored = db.transaction((tx) => {
    tx.insert(participants).values({ code: header.participant_code }).onConflictDoNothing().run();

    const inserted = tx
      .insert(sessions)
      .values({
        clientId: header.client_id,
        participantCode: header.participant_code,
        phase: header.phase,
        caseId: header.case_id,
        status,
        incompleteReason,
        startedAt: header.started_at,
        finishedAt: session.close?.finished_at ?? null,
        durationMs: session.close?.duration_ms ?? null,
        appVersion: header.app_version,
        deviceModel: header.device.model,
        deviceOsVersion: header.device.os_version,
        contractVersion: header.contract_version,
        eventCount: session.events.length,
        invalidEventCount: rejectedEvents.length,
      })
      .returning({ id: sessions.id })
      .get();

    if (session.events.length > 0) {
      tx.insert(events)
        .values(
          session.events.map((event) => ({
            sessionId: inserted.id,
            eventId: event.event_id,
            occurredAt: event.occurred_at,
            scene: event.scene,
            procedure: event.procedure,
            action: event.action,
            object: event.object ?? null,
            value: event.value === null || event.value === undefined ? null : String(event.value),
            outcome: event.outcome,
            context: event.context ?? null,
          })),
        )
        .run();
    }

    if (rejectedEvents.length > 0) {
      tx.insert(invalidEvents)
        .values(
          rejectedEvents.map((invalid) => ({
            sessionId: inserted.id,
            line: invalid.line,
            reason: invalid.reason,
            raw: invalid.raw,
          })),
        )
        .run();
    }

    const evaluation = evaluateSession({ session, config });
    const rows = evaluation.results.flatMap((result) =>
      result.metrics.map((metric) => ({
        sessionId: inserted.id,
        indicator: metric.indicator,
        metric: metric.name,
        valueType: metric.value.kind,
        valueBool: metric.value.kind === 'boolean' ? metric.value.value : null,
        valueNumber:
          metric.value.kind === 'number'
            ? metric.value.value
            : metric.value.kind === 'ratio'
              ? metric.value.value
              : null,
        valueText: metric.value.kind === 'text' ? metric.value.value : null,
        notEvaluableReason: metric.value.kind === 'not_evaluable' ? metric.value.reason : null,
        configVersion,
        approved: configApproved,
      })),
    );

    if (rows.length > 0) tx.insert(metricResults).values(rows).run();

    return inserted.id;
  });

  void stored;

  return {
    clientId: header.client_id,
    status: 'accepted',
    duplicate: false,
    eventsReceived: session.events.length,
    invalidEvents: rejectedEvents.length,
  };
}
