/**
 * Creates a dashboard user.
 *
 * Usage:
 *   node --experimental-strip-types apps/api/src/cli-create-user.ts <username> <password> [displayName]
 */
import { openDatabase } from '@sc/db';
import { createUser } from './users.ts';

const [username, password, displayName] = process.argv.slice(2);

if (!username || !password) {
  console.error('usage: cli-create-user.ts <username> <password> [displayName]');
  process.exit(1);
}

if (password.length < 10) {
  console.error('password must be at least 10 characters');
  process.exit(1);
}

const db = openDatabase(process.env.DATABASE_PATH ?? './data/data.sqlite');
await createUser(db, { username, password, displayName: displayName ?? username });
console.log(`created user ${username}`);
