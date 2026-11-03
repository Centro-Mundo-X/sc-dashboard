import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { openDatabase } from './src/client.ts';
import { seedStudyConfig } from './src/config-repo.ts';
import { seedCases } from './src/case-repo.ts';

const dir = mkdtempSync(join(tmpdir(), 'dbg-'));
const db = openDatabase(join(dir, 'a.sqlite'));
try {
  migrate(db, { migrationsFolder: './migrations' });
  console.log('migrate ok');
  seedStudyConfig(db);
  console.log('config ok');
  seedCases(db);
  console.log('cases ok');
} catch (e) {
  console.error('ERROR:', (e as Error).message);
}
