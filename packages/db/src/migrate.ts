import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { openDatabase } from './client.ts';
import { seedStudyConfig } from './config-repo.ts';

const path = process.env.DATABASE_PATH ?? './data/data.sqlite';
mkdirSync(dirname(path), { recursive: true });

const db = openDatabase(path);
migrate(db, { migrationsFolder: new URL('../migrations', import.meta.url).pathname });
seedStudyConfig(db);
console.log(`Migrated and seeded ${path}`);
