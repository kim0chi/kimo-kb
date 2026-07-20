import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

// Local SQLite for app STATE only (reading status now; notes in Phase 5).
// It never holds corpus content — the markdown remains the source of truth.

export type Status = 'unread' | 'reading' | 'done'
export const STATUSES: Status[] = ['unread', 'reading', 'done']

let db: Database.Database | null = null

function resolveDbPath(): string {
  const configured = useRuntimeConfig().stateDbPath
  return configured || join(process.cwd(), 'data', 'kb.sqlite')
}

export function useDb(): Database.Database {
  if (db) return db

  const path = resolveDbPath()
  mkdirSync(dirname(path), { recursive: true })

  db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS reading_state (
      doc_path   TEXT PRIMARY KEY,
      status     TEXT NOT NULL CHECK (status IN ('unread','reading','done')),
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
  return db
}

/** All non-default states, as a path -> status map. Absent paths are 'unread'. */
export function allStates(): Record<string, Status> {
  const rows = useDb()
    .prepare('SELECT doc_path, status FROM reading_state')
    .all() as { doc_path: string; status: Status }[]
  const out: Record<string, Status> = {}
  for (const r of rows) out[r.doc_path] = r.status
  return out
}

export function setState(docPath: string, status: Status, now: string): void {
  // 'unread' is the default — store it as an explicit row too so a deliberate
  // reset from 'done' isn't silently re-seeded or lost.
  useDb()
    .prepare(
      `INSERT INTO reading_state (doc_path, status, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(doc_path) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    )
    .run(docPath, status, now)
}

/**
 * One-time import of current progress from the old folder-drag tracker:
 * anything sitting in `done reading/` starts as 'done'. Runs once (guarded by a
 * meta flag); after that, the DB is the source of truth and the folders are ignored.
 */
export function seedOnce(allDocPaths: string[], now: string): void {
  const d = useDb()
  const seeded = d.prepare(`SELECT value FROM meta WHERE key = 'seeded'`).get()
  if (seeded) return

  const insert = d.prepare(
    `INSERT OR IGNORE INTO reading_state (doc_path, status, updated_at) VALUES (?, 'done', ?)`,
  )
  const tx = d.transaction((paths: string[]) => {
    for (const p of paths) {
      if (/\/done-reading\//.test(p)) insert.run(p, now)
    }
    d.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', ?)`).run(now)
  })
  tx(allDocPaths)
}
