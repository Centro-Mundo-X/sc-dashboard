import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseOrigin, parseTrustProxy } from './config.ts';
import { buildServer, defaultMigrationsFolder } from './http/server.ts';

const isProduction = process.env.NODE_ENV === 'production';

const dbPath = process.env.DATABASE_PATH ?? './data/data.sqlite';
const deviceToken = process.env.DEVICE_TOKEN;
const sessionSecret = process.env.SESSION_SECRET;
const port = Number(process.env.API_PORT ?? 3001);

if (!deviceToken) throw new Error('DEVICE_TOKEN is required');
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET is required and must be at least 32 characters');
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`API_PORT is not a valid port: ${process.env.API_PORT}`);
}

// Validated at start: a bad value here only shows up as a broken login.
const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
const origin = parseOrigin(process.env.ORIGIN, isProduction);

mkdirSync(dirname(dbPath), { recursive: true });

const { app } = await buildServer({
  dbPath,
  deviceToken,
  sessionSecret,
  migrationsFolder: process.env.MIGRATIONS_FOLDER ?? defaultMigrationsFolder,
  sessionSecure: isProduction,
  trustProxy,
  logger: true,
});

app.log.info({ trustProxy, origin, sessionSecure: isProduction }, 'starting the API');

// Loopback only: the dashboard in front is the only client.
await app.listen({ port, host: '127.0.0.1' });
