import { openDatabase } from '@sc/db';

/**
 * Single shared connection for the dashboard.
 *
 * The dashboard reads from the same SQLite file the API writes. WAL mode makes
 * that safe while ingestion runs.
 */
let instance: ReturnType<typeof openDatabase> | undefined;

export function getDb() {
  if (!instance) {
    instance = openDatabase(process.env.DATABASE_PATH ?? './data/data.sqlite');
  }
  return instance;
}
