import { randomUUID } from 'node:crypto'
import { useDb } from './db'

export type WorkKind = 'task' | 'idea' | 'design'
export type WorkStatus = 'queued' | 'active' | 'waiting' | 'done' | 'archived'
export interface WorkItem {
  id: string
  title: string
  kind: WorkKind
  status: WorkStatus
  project: string
  note: string
  sourceUrl: string
  createdAt: string
  updatedAt: string
}

const kinds = new Set(['task', 'idea', 'design'])
const statuses = new Set(['queued', 'active', 'waiting', 'done', 'archived'])
type Row = Omit<WorkItem, 'sourceUrl' | 'createdAt' | 'updatedAt'> & {
  source_url: string
  created_at: string
  updated_at: string
}

function fromRow(row: Row): WorkItem {
  return {
    id: row.id, title: row.title, kind: row.kind, status: row.status,
    project: row.project, note: row.note, sourceUrl: row.source_url,
    createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

function field(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string' || value.length > max) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid ' + name })
  }
  return value.trim()
}

function validate(value: unknown, previous?: WorkItem): WorkItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Expected a work item' })
  }
  const input = value as Record<string, unknown>
  const title = field(input.title ?? previous?.title, 'title', 200)
  if (!title) throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  const kind = input.kind ?? previous?.kind ?? 'task'
  const status = input.status ?? previous?.status ?? 'queued'
  if (!kinds.has(String(kind)) || !statuses.has(String(status))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid kind or status' })
  }
  if (kind === 'idea' && (status === 'active' || status === 'waiting' || status === 'done')) {
    throw createError({ statusCode: 400, statusMessage: 'Promote the idea to a task first' })
  }
  const sourceUrl = field(input.sourceUrl ?? previous?.sourceUrl ?? '', 'source link', 2000)
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol')
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'Source link must be an HTTP or HTTPS URL' })
    }
  }
  const now = new Date().toISOString()
  return {
    id: previous?.id ?? randomUUID(), title, kind: kind as WorkKind,
    status: status as WorkStatus,
    project: field(input.project ?? previous?.project ?? '', 'project', 120),
    note: field(input.note ?? previous?.note ?? '', 'note', 12000),
    sourceUrl, createdAt: previous?.createdAt ?? now, updatedAt: now,
  }
}

export function listWorkItems(): WorkItem[] {
  const rows = useDb().prepare(
    'SELECT * FROM work_items ORDER BY CASE status WHEN \'active\' THEN 0 WHEN \'queued\' THEN 1 WHEN \'waiting\' THEN 2 WHEN \'done\' THEN 3 ELSE 4 END, updated_at DESC',
  ).all() as Row[]
  return rows.map(fromRow)
}

export function saveWorkItem(value: unknown, id?: string): WorkItem {
  const d = useDb()
  const row = id ? d.prepare('SELECT * FROM work_items WHERE id = ?').get(id) as Row | undefined : undefined
  if (id && !row) throw createError({ statusCode: 404, statusMessage: 'Work item not found' })
  const item = validate(value, row ? fromRow(row) : undefined)
  d.prepare(
    'INSERT INTO work_items (id,title,kind,status,project,note,source_url,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ' +
    'ON CONFLICT(id) DO UPDATE SET title=excluded.title,kind=excluded.kind,status=excluded.status,project=excluded.project,note=excluded.note,source_url=excluded.source_url,updated_at=excluded.updated_at',
  ).run(item.id, item.title, item.kind, item.status, item.project, item.note, item.sourceUrl, item.createdAt, item.updatedAt)
  return item
}
