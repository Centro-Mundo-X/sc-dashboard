import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { Db } from '../schema/client.ts';

/**
 * Applies migrations with foreign keys temporarily disabled.
 *
 * SQLite cannot change `PRAGMA foreign_keys` inside a transaction, and Drizzle
 * wraps each migration in one, so the `PRAGMA foreign_keys=OFF` that
 * drizzle-kit emits for table rebuilds has no effect. Turning it off on the raw
 * connection before the migrator runs is what makes those rebuilds work.
 *
 * `openDatabase` re-enables it afterwards, and it is explicitly restored here
 * too so a long-running process never ends up without referential integrity.
 */
export function runMigrations(db: Db, migrationsFolder: string): void {
  const raw = db.$client;
  raw.pragma('foreign_keys = OFF');
  try {
    migrate(db, { migrationsFolder });
  } finally {
    raw.pragma('foreign_keys = ON');
  }
}
