/**
 * JSON Lines parser for session files.
 *
 * The `.jsonl` Unity writes is also the body of `POST /api/sessions/ingest`.
 * This turns that text into a validated `Session`, separating invalid events
 * instead of rejecting the whole session.
 *
 * Design rule: losing a session because one event has a malformed field is
 * unacceptable. Invalid events are reported and the session survives.
 */

import * as v from 'valibot';
import {
  EventSchema,
  SessionCloseSchema,
  SessionHeaderSchema,
  type Session,
  type SessionClose,
  type SessionEvent,
  type SessionHeader,
} from '../contract/schemas.ts';

export interface InvalidEvent {
  /** Line number in the file, 1-based. */
  line: number;
  /** Human-readable validation failure. */
  reason: string;
  /** Raw line content, kept for quarantine. */
  raw: string;
}

export type ParseResult =
  | {
      ok: true;
      session: Session;
      invalidEvents: InvalidEvent[];
      warnings: string[];
    }
  | {
      ok: false;
      reason: string;
      line?: number;
    };

type Issue = v.BaseIssue<unknown>;

function formatIssues(issues: readonly Issue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path?.map((item: v.IssuePathItem) => String(item.key)).join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

function reasonsFrom(error: unknown): string {
  if (error instanceof v.ValiError) return formatIssues(error.issues);
  return error instanceof Error ? error.message : String(error);
}



/**
 * Parses a `.jsonl` session file.
 *
 * Returns `ok: false` only when the header is missing or invalid, since without
 * it the session cannot be identified. Every other problem degrades the session
 * instead of discarding it.
 */
export function parseSessionJsonl(text: string): ParseResult {
  const lines = text.split('\n');
  const warnings: string[] = [];

  let header: SessionHeader | null = null;
  const events: SessionEvent[] = [];
  const invalidEvents: InvalidEvent[] = [];
  let close: SessionClose | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const raw = lines[i]!.trim();
    if (raw.length === 0) continue;

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      if (header === null) {
        return { ok: false, line: lineNumber, reason: 'Header is not valid JSON' };
      }
      invalidEvents.push({ line: lineNumber, reason: 'Invalid JSON', raw });
      continue;
    }

    if (typeof json !== 'object' || json === null || !('type' in json)) {
      if (header === null) {
        return { ok: false, line: lineNumber, reason: 'First line must be the header' };
      }
      invalidEvents.push({ line: lineNumber, reason: 'Missing "type" field', raw });
      continue;
    }

    const type = (json as { type: unknown }).type;

    if (header === null) {
      if (type !== 'session') {
        return { ok: false, line: lineNumber, reason: 'First line must be the header' };
      }
      const parsed = v.safeParse(SessionHeaderSchema, json);
      if (!parsed.success) {
        return {
          ok: false,
          line: lineNumber,
          reason: `Invalid header: ${formatIssues(parsed.issues)}`,
        };
      }
      header = parsed.output;
      continue;
    }

    switch (type) {
      case 'event': {
        const parsed = v.safeParse(EventSchema, json);
        if (parsed.success) {
          events.push(parsed.output);
        } else {
          invalidEvents.push({
            line: lineNumber,
            reason: formatIssues(parsed.issues),
            raw,
          });
        }
        break;
      }
      case 'close': {
        const parsed = v.safeParse(SessionCloseSchema, json);
        if (!parsed.success) {
          warnings.push(
            `Line ${lineNumber}: invalid close, ignored (${formatIssues(parsed.issues)})`,
          );
        } else if (close !== null) {
          warnings.push(`Line ${lineNumber}: duplicate close, keeping the first`);
        } else {
          close = parsed.output;
        }
        break;
      }
      case 'session':
        warnings.push(`Line ${lineNumber}: duplicate header, ignored`);
        break;
      default:
        // Unknown type: kept as a warning so a newer Unity build does not break
        // an older backend.
        warnings.push(`Line ${lineNumber}: unknown type "${String(type)}", ignored`);
    }
  }

  if (header === null) {
    return { ok: false, reason: 'File has no session header' };
  }

  return { ok: true, session: { header, events, close }, invalidEvents, warnings };
}
