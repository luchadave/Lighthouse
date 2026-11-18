
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { LIGHTHOUSE_DATABASE_PATH } from '$app/env/private';

const databasePath = resolve(
  LIGHTHOUSE_DATABASE_PATH || './data/noctiluna.db'
);

mkdirSync(dirname(databasePath), { recursive: true });

const db = new Database(databasePath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    token_type TEXT NOT NULL DEFAULT 'Bearer',
    expires_at INTEGER,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_expires
  ON sessions(expires_at);
`);

export interface SessionRecord {
  id: string;
  access_token: string;
  token_type: string;
  expires_at: number | null;
  created_at: number;
  last_seen_at: number;
}

export function createSession(session: SessionRecord): void {
  db.prepare(`
    INSERT INTO sessions (
      id, access_token, token_type, expires_at,
      created_at, last_seen_at
    )
    VALUES (
      @id, @access_token, @token_type, @expires_at,
      @created_at, @last_seen_at
    )
  `).run(session);
}

export function getSession(id: string): SessionRecord | undefined {
  return db.prepare(`
    SELECT *
    FROM sessions
    WHERE id = ?
      AND (expires_at IS NULL OR expires_at > ?)
  `).get(id, Date.now()) as SessionRecord | undefined;
}

export function deleteSession(id: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function deleteExpiredSessions(): void {
  db.prepare(`
    DELETE FROM sessions
    WHERE expires_at IS NOT NULL
      AND expires_at <= ?
  `).run(Date.now());
}
