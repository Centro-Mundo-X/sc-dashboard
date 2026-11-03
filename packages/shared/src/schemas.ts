/**
 * Valibot schemas for the data contract.
 *
 * These validate both the local `.jsonl` Unity writes and the body of
 * `POST /api/sessions/ingest`. The format is identical.
 */

import * as v from 'valibot';
import {
  CONTRACT_VERSION,
  INCOMPLETE_REASONS,
  OUTCOMES,
  PHASES,
  PROCEDURES,
  SCENES,
} from './enums.ts';

/** Anonymous participant code: `P` followed by two digits. */
export const ParticipantCodeSchema = v.pipe(
  v.string(),
  v.regex(/^P\d{2}$/, 'Expected P01, P02, ...'),
);

/**
 * Case slug. The backend does not validate it against any catalog: Unity owns
 * both the catalog and the assignment.
 */
export const CaseIdSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a lowercase hyphenated slug'),
  v.maxLength(120),
);

/** ISO 8601 UTC timestamp with milliseconds. */
export const Iso8601UtcSchema = v.pipe(
  v.string(),
  v.isoTimestamp(),
  v.check((s) => s.endsWith('Z'), 'Expected UTC (Z suffix)'),
);

/** UUIDv7 in lowercase. Session idempotency key. */
export const UuidV7Schema = v.pipe(
  v.string(),
  v.regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    'Expected a lowercase UUIDv7',
  ),
);

/** Free-form event context. Must never hold identifying data. */
export const ContextSchema = v.pipe(
  v.record(v.string(), v.union([v.string(), v.number(), v.boolean()])),
  v.check((o) => Object.keys(o).length <= 8, 'At most 8 context keys'),
);

const DeviceSchema = v.object({
  model: v.pipe(v.string(), v.minLength(1), v.maxLength(64)),
  os_version: v.pipe(v.string(), v.minLength(1), v.maxLength(64)),
});

export const SessionHeaderSchema = v.object({
  type: v.literal('session'),
  contract_version: v.literal(CONTRACT_VERSION),
  client_id: UuidV7Schema,
  participant_code: ParticipantCodeSchema,
  phase: v.picklist(PHASES),
  case_id: CaseIdSchema,
  started_at: Iso8601UtcSchema,
  app_version: v.pipe(v.string(), v.regex(/^\d+\.\d+\.\d+/)),
  device: DeviceSchema,
});
export type SessionHeader = v.InferOutput<typeof SessionHeaderSchema>;

export const EventSchema = v.object({
  type: v.literal('event'),
  event_id: v.pipe(v.number(), v.integer(), v.minValue(1)),
  occurred_at: Iso8601UtcSchema,
  scene: v.picklist(SCENES),
  procedure: v.picklist(PROCEDURES),
  action: v.pipe(
    v.string(),
    v.regex(/^[a-z][a-z0-9_]*$/, 'Expected snake_case'),
    v.maxLength(64),
  ),
  object: v.nullish(v.pipe(v.string(), v.maxLength(64)), null),
  value: v.nullish(v.union([v.string(), v.number()]), null),
  outcome: v.picklist(OUTCOMES),
  context: v.nullish(ContextSchema, null),
});
export type SessionEvent = v.InferOutput<typeof EventSchema>;

export const SessionCloseSchema = v.object({
  type: v.literal('close'),
  finished_at: Iso8601UtcSchema,
  duration_ms: v.pipe(v.number(), v.integer(), v.minValue(0)),
  scenes_completed: v.array(v.picklist(SCENES)),
  total_events: v.pipe(v.number(), v.integer(), v.minValue(0)),
  incomplete_reason: v.optional(v.picklist(INCOMPLETE_REASONS)),
});
export type SessionClose = v.InferOutput<typeof SessionCloseSchema>;

/**
 * A session as it arrives. `close` is nullable because an interrupted session
 * may lack it; the backend then marks the session `incomplete`.
 */
export const SessionSchema = v.object({
  header: SessionHeaderSchema,
  events: v.array(EventSchema),
  close: v.nullish(SessionCloseSchema, null),
});
export type Session = v.InferOutput<typeof SessionSchema>;
