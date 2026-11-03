import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { runMigrations } from './migrations-runner.ts';
import { openDatabase, type Db } from '../schema/client.ts';
import { seedStudyConfig } from '../repositories/config-repo.ts';
import { seedCases } from '../repositories/case-repo.ts';

/**
 * Opens a database and brings it up to date: migrations, study config and the
 * case catalog.
 *
 * A function, not a module side effect. Importing the package must not touch
 * the filesystem, or every consumer migrates on import — including the
 * dashboard build, which has no database to migrate.
 */
export function prepareDatabase(
  path = process.env.DATABASE_PATH ?? './data/data.sqlite',
): Db {
  mkdirSync(dirname(path), { recursive: true });

  const db = openDatabase(path);
  runMigrations(db, new URL('../../migrations', import.meta.url).pathname);
  seedStudyConfig(db);
  seedCases(db);

  return db;
}

// `node packages/db/src/migrations/migrate.ts` still works from the CLI.
if (process.argv[1]?.endsWith('migrate.ts')) {
  const path = process.env.DATABASE_PATH ?? './data/data.sqlite';
  prepareDatabase(path);
  console.log(`Migrated and seeded ${path}`);
}
