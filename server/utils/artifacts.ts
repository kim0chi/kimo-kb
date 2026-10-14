import { randomUUID } from 'node:crypto'
import { useDb } from './db'

export interface ReadingArtifact {
  id: string
  title: string
  sourcePath: string
  sourceTitle: string
  focus: string
  content: string
  model: string
  createdAt: string
  readAt: string | null
}

export type ReadingArtifactSummary = Pick<ReadingArtifact,
  'id' | 'title' | 'sourcePath' | 'sourceTitle' | 'createdAt' | 'readAt'> & { preview: string }

interface ArtifactRow {
  id: string
  title: string
  source_path: string
  source_title: string
  focus: string
  content: string
  model: string
  created_at: string
  read_at: string | null
}

function fromRow(row: ArtifactRow): ReadingArtifact {
  return {
    id: row.id, title: row.title, sourcePath: row.source_path,
    sourceTitle: row.source_title, focus: row.focus, content: row.content,
    model: row.model, createdAt: row.created_at, readAt: row.read_at,
  }
}

export function createArtifact(input: {
  title: string; sourcePath: string; sourceTitle: string
  focus: string; content: string; model: string
}): ReadingArtifact {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  useDb().prepare(`INSERT INTO reading_artifacts
    (id, title, source_path, source_title, focus, content, model, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, input.title, input.sourcePath, input.sourceTitle, input.focus, input.content, input.model, createdAt)
  return { id, ...input, createdAt, readAt: null }
}

export function listArtifacts(): ReadingArtifactSummary[] {
  const rows = useDb().prepare(`SELECT id, title, source_path, source_title,
    substr(content, 1, 500) AS preview, created_at, read_at
    FROM reading_artifacts ORDER BY (read_at IS NOT NULL), created_at DESC`).all() as
    (Pick<ArtifactRow, 'id' | 'title' | 'source_path' | 'source_title' | 'created_at' | 'read_at'> & { preview: string })[]
  return rows.map(row => ({
    id: row.id, title: row.title, sourcePath: row.source_path,
    sourceTitle: row.source_title, preview: row.preview,
    createdAt: row.created_at, readAt: row.read_at,
  }))
}

export function getArtifact(id: string): ReadingArtifact | null {
  const row = useDb().prepare('SELECT * FROM reading_artifacts WHERE id = ?').get(id) as ArtifactRow | undefined
  return row ? fromRow(row) : null
}

export function setArtifactRead(id: string, read: boolean): ReadingArtifact | null {
  const result = useDb().prepare('UPDATE reading_artifacts SET read_at = ? WHERE id = ?')
    .run(read ? new Date().toISOString() : null, id)
  return result.changes ? getArtifact(id) : null
}
