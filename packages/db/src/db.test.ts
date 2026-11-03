import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { runMigrations } from './migrations/migrations-runner.ts';
import { eq } from 'drizzle-orm';
import { openDatabase } from './schema/client.ts';
import { loadStudyConfig, seedStudyConfig } from './repositories/config-repo.ts';
import { findCase, listCases, seedCases } from './repositories/case-repo.ts';
import { cases, participants, sessions, studyConfig } from './schema/tables.ts';

const dir = mkdtempSync(join(tmpdir(), 'sc-db-'));
const dbPath = join(dir, 'test.sqlite');
const migrationsFolder = new URL('../migrations', import.meta.url).pathname;

/** Opens the shared test database. Schema is created once in `before`. */
function migratedDb() {
  return openDatabase(dbPath);
}

before(() => {
  runMigrations(migratedDb(), migrationsFolder);
  seedStudyConfig(migratedDb());
  seedCases(migratedDb());
});

after(() => rmSync(dir, { recursive: true, force: true }));

describe('study config', () => {
  it('seeds provisional values marked as unapproved', () => {
    const db = migratedDb();
    seedStudyConfig(db);
    const snapshot = loadStudyConfig(db);

    // Only params that apply to every case live here; case values are on the case.
    assert.equal(Object.keys(snapshot.values).length, 4);
    assert.equal(snapshot.approved, false);
    assert.equal(snapshot.pendingKeys.length, 4);
    assert.equal(snapshot.values['min_gaze_ms'], 3000);
  });

  it('does not overwrite existing values when seeding twice', () => {
    const db = migratedDb();
    db.update(studyConfig).set({ approved: true }).where(eq(studyConfig.key, 'min_gaze_ms')).run();
    seedStudyConfig(db);

    const rows = db.select().from(studyConfig).all();
    assert.equal(rows.length, 4);
    assert.equal(rows.find((r) => r.key === 'min_gaze_ms')?.approved, true);
  });

  it('reports approval only when every key is approved', () => {
    const db = migratedDb();
    db.update(studyConfig).set({ approved: true }).run();
    assert.equal(loadStudyConfig(db).approved, true);
  });
});

describe('sessions', () => {
  it('rejects a duplicate client_id', () => {
    const db = migratedDb();
    db.insert(participants).values({ code: 'P01' }).run();
    const row = {
      clientId: '0192f3a4-5b6c-7d8e-9f01-234567890abc',
      participantCode: 'P01',
      phase: 'single',
      caseId: 'case-01-chest-pain',
      status: 'complete',
      startedAt: '2026-11-04T14:32:10.000Z',
      appVersion: '0.9.3',
      deviceModel: 'Meta Quest 3',
      deviceOsVersion: 'Horizon OS 74',
      contractVersion: '1.0',
    };
    db.insert(sessions).values(row).run();
    assert.throws(() => db.insert(sessions).values(row).run());
  });
});

describe('cases', () => {
  it('seeds the case catalog', () => {
    const db = migratedDb();
    const all = listCases(db);
    assert.equal(all.length, 2);
    assert.equal(all[0]?.id, 'case-01-chest-pain');
    assert.equal(all[0]?.label, 'Dolor torácico');
  });

  it('returns null for an unknown case', () => {
    assert.equal(findCase(migratedDb(), 'caso-99'), null);
  });

  it('lets a case exist without criteria', () => {
    const db = migratedDb();
    db.insert(cases)
      .values({ id: 'case-99-empty', label: 'Sin definir', version: 1, criteria: null, approved: false })
      .run();
    const row = findCase(db, 'case-99-empty');
    assert.equal(row?.criteria, null);
  });

  it('refuses a session whose case is not in the catalog', () => {
    const db = migratedDb();
    db.insert(participants).values({ code: 'P02' }).onConflictDoNothing().run();
    assert.throws(() =>
      db
        .insert(sessions)
        .values({
          clientId: '0192f3a4-5b6c-7d8e-9f01-234567899999',
          participantCode: 'P02',
          phase: 'single',
          caseId: 'caso-99',
          status: 'complete',
          startedAt: '2026-11-04T14:32:10.000Z',
          appVersion: '0.9.3',
          deviceModel: 'Meta Quest 3',
          deviceOsVersion: 'Horizon OS 74',
          contractVersion: '1.0',
        })
        .run(),
    );
  });
});
