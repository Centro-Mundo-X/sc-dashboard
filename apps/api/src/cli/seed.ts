/**
 * Prepares a local database: migrates, seeds the study config, creates a
 * dashboard user and ingests the sample session.
 *
 * Usage:
 *   pnpm seed
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadStudyConfig } from '@sc/db';
import { ingestSession } from '../services/ingest.ts';
import { buildServer, defaultMigrationsFolder } from '../http/server.ts';
import { createUser } from '../services/users.ts';

const dbPath = process.env.DATABASE_PATH ?? './data/data.sqlite';
const username = process.env.SEED_USER ?? 'demo';
const password = process.env.SEED_PASSWORD ?? 'demo-access-2024';

mkdirSync(dirname(dbPath), { recursive: true });

// buildServer migrates and seeds the config, so this reuses it instead of
// duplicating the steps.
const { app, db } = await buildServer({
  dbPath,
  deviceToken: 'seed-only',
  sessionSecret: 'seed-only-secret-at-least-32-characters-long',
  migrationsFolder: process.env.MIGRATIONS_FOLDER ?? defaultMigrationsFolder,
  logger: false,
});

try {
  await createUser(db, { username, password, displayName: 'Demo' });
  console.log(`Created user ${username}.`);
} catch {
  console.log(`User ${username} already existed.`);
}

const text = readFileSync(resolve('fixtures/session-complete.jsonl'), 'utf8');
const config = loadStudyConfig(db);
const result = ingestSession(db, text, config.values, config.version, config.approved);

if (result.status === 'accepted') {
  console.log(
    result.duplicate
      ? 'Sample session was already loaded.'
      : `Sample session loaded (${result.eventsReceived} events).`,
  );
} else {
  console.log(`Could not load the sample session: ${result.error}`);
}

await app.close();

console.log('');
console.log(`Database ready at ${dbPath}.`);
console.log(`User: ${username} / ${password}`);
