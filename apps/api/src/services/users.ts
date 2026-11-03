import { hash, verify } from '@node-rs/argon2';
import type { Db } from '@sc/db';
import { users } from '@sc/db';
import { eq } from 'drizzle-orm';

const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function createUser(
  db: Db,
  input: { username: string; password: string; displayName: string },
): Promise<void> {
  const passwordHash = await hashPassword(input.password);
  db.insert(users)
    .values({ username: input.username, passwordHash, displayName: input.displayName })
    .run();
}

/**
 * Verifies credentials. Returns the user id on success, null otherwise.
 *
 * A missing user and a wrong password both return null in similar time, so the
 * response does not reveal which usernames exist.
 */
export async function verifyCredentials(
  db: Db,
  username: string,
  password: string,
): Promise<{ id: number; username: string } | null> {
  const row = db.select().from(users).where(eq(users.username, username)).get();
  if (!row) {
    // Burn comparable time so timing does not leak account existence.
    await verify(
      '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZXZhbHVl$0000000000000000000000000000000000000000000',
      password,
    ).catch(() => false);
    return null;
  }
  const ok = await verify(row.passwordHash, password).catch(() => false);
  return ok ? { id: row.id, username: row.username } : null;
}
