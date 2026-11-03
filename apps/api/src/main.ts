import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildServer, defaultMigrationsFolder } from './server.ts';

const dbPath = process.env.DATABASE_PATH ?? './data/data.sqlite';
const deviceToken = process.env.DEVICE_TOKEN;
const sessionSecret = process.env.SESSION_SECRET;
const port = Number(process.env.PORT ?? 3000);

if (!deviceToken) throw new Error('DEVICE_TOKEN is required');
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET is required and must be at least 32 characters');
}

mkdirSync(dirname(dbPath), { recursive: true });

const { app } = await buildServer({
  dbPath,
  deviceToken,
  sessionSecret,
  migrationsFolder: process.env.MIGRATIONS_FOLDER ?? defaultMigrationsFolder,
  sessionSecure: process.env.NODE_ENV === 'production',
  logger: true,
});

await app.listen({ port, host: '0.0.0.0' });
