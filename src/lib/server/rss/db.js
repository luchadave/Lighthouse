// @ts-nocheck
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const path = process.env.LIGHTHOUSE_RSS_DATABASE_PATH || './data/lighthouse-rss.db';
mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
export const db = new DatabaseSync(path);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS feeds(id INTEGER PRIMARY KEY, url TEXT UNIQUE NOT NULL, title TEXT NOT NULL, fetched_at INTEGER DEFAULT 0, error TEXT, etag TEXT, modified TEXT);
CREATE TABLE IF NOT EXISTS articles(id INTEGER PRIMARY KEY, feed_id INTEGER REFERENCES feeds(id) ON DELETE SET NULL, source TEXT NOT NULL, identity TEXT NOT NULL, url TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, published INTEGER, fetched_at INTEGER NOT NULL, saved INTEGER NOT NULL DEFAULT 0, read INTEGER NOT NULL DEFAULT 0, UNIQUE(feed_id,identity));
CREATE TABLE IF NOT EXISTS seen(feed_id INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE, identity TEXT NOT NULL, PRIMARY KEY(feed_id,identity));
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, token TEXT NOT NULL, account TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS articles_fetched ON articles(fetched_at);
CREATE INDEX IF NOT EXISTS articles_date ON articles(COALESCE(published,fetched_at) DESC,id DESC);
CREATE INDEX IF NOT EXISTS articles_feed_read ON articles(feed_id,read);
CREATE INDEX IF NOT EXISTS articles_saved ON articles(saved);
`);
export const RETENTION = 3 * 24 * 3600 * 1000;
export const INTERVAL = 6 * 3600 * 1000;
export function cleanup(now = Date.now()) {
  db.prepare('DELETE FROM articles WHERE saved=0 AND fetched_at < ?').run(now - RETENTION);
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(now);
}
export function addFeed(url, title = url) {
  db.prepare('INSERT OR IGNORE INTO feeds(url,title) VALUES (?,?)').run(url, title);
  return db.prepare('SELECT * FROM feeds WHERE url=?').get(url);
}
export function storeArticles(feed, items, now = Date.now()) {
  db.exec('BEGIN');
  try {
    for (const item of items) {
      const seen = db.prepare('INSERT OR IGNORE INTO seen(feed_id,identity) VALUES (?,?)').run(feed.id, item.identity);
      if (seen.changes) db.prepare('INSERT INTO articles(feed_id,source,identity,url,title,content,published,fetched_at) VALUES (?,?,?,?,?,?,?,?)').run(feed.id, feed.title, item.identity, item.url, item.title, item.content, item.published, now);
    }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
