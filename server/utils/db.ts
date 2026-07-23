import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { schedule, type CardSched } from '../../lib/srs'

// Local SQLite for app STATE only (reading status + per-doc notes).
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
    CREATE TABLE IF NOT EXISTS notes (
      doc_path   TEXT PRIMARY KEY,
      body       TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS flashcards (
      card_id    TEXT PRIMARY KEY,
      ease       REAL NOT NULL,
      interval   INTEGER NOT NULL,
      reps       INTEGER NOT NULL,
      due        TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS exercises (
      exercise_id TEXT PRIMARY KEY,
      ease        REAL NOT NULL,
      interval    INTEGER NOT NULL,
      reps        INTEGER NOT NULL,
      due         TEXT NOT NULL,
      attempt     TEXT NOT NULL DEFAULT '',
      updated_at  TEXT NOT NULL
    );
  `)
  migrateNamespacePaths(db)
  return db
}

/** Review schedule for every card that has been graded, keyed by card id. */
export function cardStates(): Record<string, CardSched> {
  const rows = useDb()
    .prepare('SELECT card_id, ease, interval, reps, due FROM flashcards')
    .all() as (CardSched & { card_id: string })[]
  const out: Record<string, CardSched> = {}
  for (const r of rows) out[r.card_id] = { ease: r.ease, interval: r.interval, reps: r.reps, due: r.due }
  return out
}

/** Apply a grade (0 Again … 3 Easy) to a card and persist the new schedule. */
export function gradeCard(id: string, grade: number, now: Date): CardSched {
  const d = useDb()
  const prev = d
    .prepare('SELECT ease, interval, reps, due FROM flashcards WHERE card_id = ?')
    .get(id) as CardSched | undefined
  const next = schedule(prev ?? null, grade, now)
  d.prepare(
    `INSERT INTO flashcards (card_id, ease, interval, reps, due, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(card_id) DO UPDATE SET ease = excluded.ease, interval = excluded.interval,
       reps = excluded.reps, due = excluded.due, updated_at = excluded.updated_at`,
  ).run(id, next.ease, next.interval, next.reps, next.due, now.toISOString())
  return next
}

/** Exercise schedule + the last answer written, keyed by exercise id. */
export function exerciseStates(): Record<string, ExerciseSched> {
  const rows = useDb()
    .prepare('SELECT exercise_id, ease, interval, reps, due, attempt FROM exercises')
    .all() as (ExerciseSched & { exercise_id: string })[]
  const out: Record<string, ExerciseSched> = {}
  for (const r of rows) {
    out[r.exercise_id] = {
      ease: r.ease,
      interval: r.interval,
      reps: r.reps,
      due: r.due,
      attempt: r.attempt ?? '',
    }
  }
  return out
}

export type ExerciseSched = CardSched & { attempt: string }

/**
 * Grade an exercise (0 Missed it … 3 Nailed it) and keep the answer that was
 * written. Keeping it is the point: next time round you see what you said last time
 * and can watch the explanation get sharper.
 */
export function gradeExercise(id: string, grade: number, attempt: string, now: Date): ExerciseSched {
  const d = useDb()
  const prev = d
    .prepare('SELECT ease, interval, reps, due FROM exercises WHERE exercise_id = ?')
    .get(id) as CardSched | undefined
  const next = schedule(prev ?? null, grade, now)
  d.prepare(
    `INSERT INTO exercises (exercise_id, ease, interval, reps, due, attempt, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(exercise_id) DO UPDATE SET ease = excluded.ease, interval = excluded.interval,
       reps = excluded.reps, due = excluded.due, attempt = excluded.attempt,
       updated_at = excluded.updated_at`,
  ).run(id, next.ease, next.interval, next.reps, next.due, attempt, now.toISOString())
  return { ...next, attempt }
}

// One-time: re-key state/notes from the pre-notebook paths (/si_docs, /notes,
// /decisions) to the namespaced ones (/si/si-docs, /si/notes, /si/decisions), so
// existing reading progress and notes survive the multi-notebook migration.
function migrateNamespacePaths(d: Database.Database): void {
  if (d.prepare(`SELECT 1 FROM meta WHERE key = 'ns_migrated_v1'`).get()) return
  const map: [string, string][] = [
    ['/si_docs/', '/si/si-docs/'],
    ['/notes/', '/si/notes/'],
    ['/decisions/', '/si/decisions/'],
  ]
  const now = new Date().toISOString()
  const tx = d.transaction(() => {
    for (const table of ['reading_state', 'notes']) {
      for (const [oldP, newP] of map) {
        const rows = d
          .prepare(`SELECT doc_path FROM ${table} WHERE doc_path LIKE ?`)
          .all(`${oldP}%`) as { doc_path: string }[]
        for (const { doc_path } of rows) {
          const np = doc_path.replace(oldP, newP)
          try {
            d.prepare(`UPDATE ${table} SET doc_path = ? WHERE doc_path = ?`).run(np, doc_path)
          } catch {
            // Target already exists (dup) — drop the stale old row.
            d.prepare(`DELETE FROM ${table} WHERE doc_path = ?`).run(doc_path)
          }
        }
      }
    }
    d.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('ns_migrated_v1', ?)`).run(now)
  })
  tx()
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

export interface Note {
  body: string
  updatedAt: string
}

export function getNote(docPath: string): Note | null {
  const row = useDb()
    .prepare('SELECT body, updated_at FROM notes WHERE doc_path = ?')
    .get(docPath) as { body: string; updated_at: string } | undefined
  return row ? { body: row.body, updatedAt: row.updated_at } : null
}

/** Upsert a note; an empty body deletes the row so indicators stay accurate. */
export function setNote(docPath: string, body: string, now: string): void {
  const d = useDb()
  if (!body.trim()) {
    d.prepare('DELETE FROM notes WHERE doc_path = ?').run(docPath)
    return
  }
  d.prepare(
    `INSERT INTO notes (doc_path, body, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(doc_path) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
  ).run(docPath, body, now)
}

/** Paths that currently have a note — for indicators in nav/index. */
export function notedPaths(): string[] {
  const rows = useDb().prepare('SELECT doc_path FROM notes').all() as { doc_path: string }[]
  return rows.map((r) => r.doc_path)
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
