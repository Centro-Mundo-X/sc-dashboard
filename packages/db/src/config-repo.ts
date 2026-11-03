import { eq } from 'drizzle-orm';
import type { Db } from './client.ts';
import { studyConfig } from './schema.ts';
import { STUDY_CONFIG_SEED } from './seed.ts';

/** Configuration values the metric engine reads, with approval state. */
export interface StudyConfigSnapshot {
  values: Record<string, unknown>;
  /** Highest config version present; stored on every metric result. */
  version: number;
  /** True only when every parameter is clinically approved. */
  approved: boolean;
  /** Keys still pending approval. */
  pendingKeys: string[];
}

/**
 * Installs the provisional values. Idempotent: existing rows are left alone so
 * a human edit or an approval is never overwritten by a restart.
 */
export function seedStudyConfig(db: Db): void {
  const existing = new Set(db.select({ key: studyConfig.key }).from(studyConfig).all().map((r) => r.key));
  const missing = STUDY_CONFIG_SEED.filter((entry) => !existing.has(entry.key));
  if (missing.length === 0) return;

  db.insert(studyConfig)
    .values(
      missing.map((entry) => ({
        key: entry.key,
        value: entry.value,
        approved: false,
        description: entry.description,
      })),
    )
    .run();
}

export function loadStudyConfig(db: Db): StudyConfigSnapshot {
  const rows = db.select().from(studyConfig).all();
  const values: Record<string, unknown> = {};
  const pendingKeys: string[] = [];
  let version = 1;

  for (const row of rows) {
    values[row.key] = row.value;
    if (!row.approved) pendingKeys.push(row.key);
    version = Math.max(version, row.version);
  }

  return { values, version, approved: pendingKeys.length === 0, pendingKeys };
}

export function approveConfigKey(db: Db, key: string): boolean {
  const result = db
    .update(studyConfig)
    .set({ approved: true })
    .where(eq(studyConfig.key, key))
    .run();
  return result.changes > 0;
}
