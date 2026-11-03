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
import { ingestSession } from './ingest.ts';
import { buildServer } from './server.ts';
import { createUser } from './users.ts';

const dbPath = process.env.DATABASE_PATH ?? './data/data.sqlite';
const username = process.env.SEED_USER ?? 'psicologa';
const password = process.env.SEED_PASSWORD ?? 'clave-de-prueba';

mkdirSync(dirname(dbPath), { recursive: true });

// buildServer migrates and seeds the config, so this reuses it instead of
// duplicating the steps.
const { app, db } = await buildServer({
  dbPath,
  deviceToken: 'seed-only',
  sessionSecret: 'seed-only-secret-at-least-32-characters-long',
  migrationsFolder:
    process.env.MIGRATIONS_FOLDER ??
    new URL('../../../packages/db/migrations', import.meta.url).pathname,
  logger: false,
});

try {
  await createUser(db, { username, password, displayName: 'Psicóloga' });
  console.log(`usuario creado: ${username}`);
} catch {
  console.log(`usuario ${username} ya existía`);
}

const text = readFileSync(resolve('fixtures/session-complete.jsonl'), 'utf8');
const config = loadStudyConfig(db);
const result = ingestSession(db, text, config.values, config.version, config.approved);

if (result.status === 'accepted') {
  console.log(
    result.duplicate
      ? 'sesión de ejemplo ya estaba cargada'
      : `sesión de ejemplo cargada (${result.eventsReceived} eventos)`,
  );
} else {
  console.log(`no se pudo cargar la sesión: ${result.error}`);
}

await app.close();

console.log('');
console.log(`base lista en ${dbPath}`);
console.log(`usuario: ${username} / ${password}`);
