import { eq } from 'drizzle-orm';
import type { Db } from './client.ts';
import { cases } from './schema.ts';
import { CASE_SEED } from './seed.ts';

export interface CaseRow {
  id: string;
  label: string;
  version: number;
  criteria: Record<string, unknown> | null;
  approved: boolean;
}

/**
 * Installs the case catalog. Idempotent: an existing row is left alone so a
 * human edit or an approval is never overwritten by a restart.
 */
export function seedCases(db: Db): void {
  const existing = new Set(db.select({ id: cases.id }).from(cases).all().map((r) => r.id));
  const missing = CASE_SEED.filter((entry) => !existing.has(entry.id));
  if (missing.length === 0) return;

  db.insert(cases)
    .values(
      missing.map((entry) => ({
        id: entry.id,
        label: entry.label,
        version: 1,
        criteria: entry.criteria,
        approved: false,
      })),
    )
    .run();
}

export function listCases(db: Db): CaseRow[] {
  const rows = db
    .select({
      id: cases.id,
      label: cases.label,
      version: cases.version,
      criteria: cases.criteria,
      approved: cases.approved,
    })
    .from(cases)
    .orderBy(cases.id)
    .all();
  return rows.map(narrow);
}

/** JSON columns come back as unknown; the catalog controls what goes in. */
function narrow(row: {
  id: string;
  label: string;
  version: number;
  criteria: unknown;
  approved: boolean;
}): CaseRow {
  return {
    ...row,
    criteria: (row.criteria as Record<string, unknown> | null) ?? null,
  };
}

/** Returns null when the case is not in the catalog. */
export function findCase(db: Db, id: string): CaseRow | null {
  const row = db
    .select({
      id: cases.id,
      label: cases.label,
      version: cases.version,
      criteria: cases.criteria,
      approved: cases.approved,
    })
    .from(cases)
    .where(eq(cases.id, id))
    .get();
  return row ? narrow(row) : null;
}

/** Criteria for a case, or empty when it is unknown or has none. */
export function criteriaFor(db: Db, id: string): Record<string, unknown> {
  return findCase(db, id)?.criteria ?? {};
}
