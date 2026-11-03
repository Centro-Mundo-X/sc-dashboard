import type { Db } from '@sc/db';
import { criteriaFor, events, metricResults, sessions } from '@sc/db';
import { evaluateSession } from '@sc/metrics';
import { eq } from 'drizzle-orm';
import type { SessionEvent, SessionHeader } from '@sc/shared';

export interface RecalculateOutcome {
  sessionId: number;
  metricsWritten: number;
  notEvaluable: number;
}

/**
 * Recomputes metrics for one session.
 *
 * `metric_results` is derived, so this drops the old rows and writes new ones.
 * Used after a study config criterion changes.
 */
export function recalculateSession(
  db: Db,
  sessionId: number,
  config: Record<string, unknown>,
  configVersion: number,
  configApproved: boolean,
): RecalculateOutcome | null {
  const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session) return null;

  const storedEvents = db
    .select()
    .from(events)
    .where(eq(events.sessionId, sessionId))
    .orderBy(events.eventId)
    .all();

  const header: SessionHeader = {
    type: 'session',
    contract_version: session.contractVersion as SessionHeader['contract_version'],
    client_id: session.clientId,
    participant_code: session.participantCode,
    phase: session.phase as SessionHeader['phase'],
    case_id: session.caseId,
    started_at: session.startedAt,
    app_version: session.appVersion,
    device: { model: session.deviceModel, os_version: session.deviceOsVersion },
  };

  const parsedEvents: SessionEvent[] = storedEvents.map((row) => ({
    type: 'event',
    event_id: row.eventId,
    occurred_at: row.occurredAt,
    scene: row.scene as SessionEvent['scene'],
    procedure: row.procedure as SessionEvent['procedure'],
    action: row.action,
    object: row.object,
    value: row.value as string | number | null,
    outcome: row.outcome as SessionEvent['outcome'],
    context: (row.context as Record<string, string | number | boolean> | null) ?? null,
  }));

  const evaluation = evaluateSession({
    session: { header, events: parsedEvents },
    config,
    caseCriteria: criteriaFor(db, session.caseId) as never,
  });

  const rows = evaluation.results.flatMap((result) =>
    result.metrics.map((metric) => ({
      sessionId,
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

  db.transaction((tx) => {
    tx.delete(metricResults).where(eq(metricResults.sessionId, sessionId)).run();
    if (rows.length > 0) tx.insert(metricResults).values(rows).run();
  });

  return {
    sessionId,
    metricsWritten: rows.length,
    notEvaluable: evaluation.notEvaluableCount,
  };
}
