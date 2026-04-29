// ──────────────────────────────────────────────────────────────────────────────
// SQLite layer.
// Locally we persist to ./data/app.db. On Vercel the runtime FS is read-only
// except for /tmp, so we point there. Vercel's /tmp is per-instance and
// ephemeral — leads survive the warm instance, not cold starts. For a real
// deploy you'd swap this to Turso/Postgres; the rest of the app is unchanged.
// ──────────────────────────────────────────────────────────────────────────────

import 'server-only';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { seed } from './seed';

let _db: Database.Database | null = null;
let _seeded = false;

function dbPath(): string {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return '/tmp/app.db';
  }
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'app.db');
}

export function getDb(): Database.Database {
  if (_db) return _db;
  const db = new Database(dbPath());
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS personas (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      tagline     TEXT NOT NULL,
      emoji       TEXT NOT NULL,
      description TEXT NOT NULL,
      data        TEXT NOT NULL  -- full JSON blob (preferences, highlights)
    );

    CREATE TABLE IF NOT EXISTS cars (
      id            TEXT PRIMARY KEY,
      brand         TEXT NOT NULL,
      model         TEXT NOT NULL,
      variant       TEXT NOT NULL,
      body          TEXT NOT NULL,
      fuel          TEXT NOT NULL,
      transmission  TEXT NOT NULL,
      seats         INTEGER NOT NULL,
      price_lakh    REAL NOT NULL,
      fe_kmpl       REAL NOT NULL,
      safety        REAL NOT NULL,
      boot_l        INTEGER NOT NULL,
      length_mm     INTEGER NOT NULL,
      ground_mm     INTEGER NOT NULL,
      image_url     TEXT NOT NULL,
      one_liner     TEXT NOT NULL,
      data          TEXT NOT NULL  -- pros/cons + media JSON
    );

    CREATE TABLE IF NOT EXISTS leads (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id      TEXT NOT NULL,
      persona_id  TEXT,
      intent      TEXT NOT NULL,
      name        TEXT NOT NULL,
      phone       TEXT NOT NULL,
      city        TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS views (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id      TEXT NOT NULL,
      persona_id  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS views_car_persona_idx ON views(car_id, persona_id);
    CREATE INDEX IF NOT EXISTS leads_car_idx ON leads(car_id);
  `);

  _db = db;

  // Seed on first connection if cars table is empty.
  if (!_seeded) {
    const count = (db.prepare('SELECT COUNT(*) AS n FROM cars').get() as { n: number }).n;
    if (count === 0) {
      seed(db);
    }
    _seeded = true;
  }

  return db;
}
