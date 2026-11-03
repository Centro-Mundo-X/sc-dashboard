import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.ts';

/**
 * Opens a SQLite database with the pragmas this project requires.
 *
 * WAL lets the dashboard read while ingestion writes. Without it the two
 * block each other. `foreign_keys` is off by default in SQLite and must be
 * enabled per connection.
 */
export function openDatabase(path: string) {
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof openDatabase>;
export { schema };
