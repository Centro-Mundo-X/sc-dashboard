import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { runMigrations } from './migrations-runner.ts';
import { openDatabase } from './client.ts';
import { seedStudyConfig } from './config-repo.ts';
import { seedCases } from './case-repo.ts';

const path = process.env.DATABASE_PATH ?? './data/data.sqlite';
mkdirSync(dirname(path), { recursive: true });

const db = openDatabase(path);
runMigrations(db, new URL('../migrations', import.meta.url).pathname);
seedStudyConfig(db);
seedCases(db);
console.log(`Migrated and seeded ${path}`);
