import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';
import { log } from './logger.js';

fs.mkdirSync(config.dataDir, { recursive: true });
const dbPath = path.join(config.dataDir, 'rakta-setu.sqlite');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS patients (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  phone       TEXT,
  age         INTEGER,
  sex         TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

CREATE TABLE IF NOT EXISTS reports (
  id                 TEXT PRIMARY KEY,
  token              TEXT NOT NULL UNIQUE,
  patient_id         TEXT NOT NULL REFERENCES patients(id),
  lab_no             TEXT,
  source_file        TEXT,
  source_hash        TEXT UNIQUE,
  collected_at       TEXT,
  reported_at        TEXT,
  doctor             TEXT,
  measurements_json  TEXT NOT NULL,
  interpretation_json TEXT NOT NULL,
  pin_hash           TEXT,
  status             TEXT NOT NULL DEFAULT 'pending',
  expires_at         TEXT,
  first_opened_at    TEXT,
  open_count         INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_token ON reports(token);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

CREATE TABLE IF NOT EXISTS deliveries (
  id                  TEXT PRIMARY KEY,
  report_id           TEXT NOT NULL REFERENCES reports(id),
  driver              TEXT NOT NULL,
  to_phone            TEXT,
  status              TEXT NOT NULL,
  provider_message_id TEXT,
  error               TEXT,
  attempt             INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_deliveries_report ON deliveries(report_id);

CREATE TABLE IF NOT EXISTS questions (
  id         TEXT PRIMARY KEY,
  report_id  TEXT NOT NULL REFERENCES reports(id),
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  source     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_questions_report ON questions(report_id);

CREATE TABLE IF NOT EXISTS audit (
  id         TEXT PRIMARY KEY,
  report_id  TEXT,
  event      TEXT NOT NULL,
  meta       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

log.info(`डेटाबेस तयार · database ready at ${dbPath}`);

export function closeDb() {
  try { db.close(); } catch { /* already closed */ }
}
