import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export type ArtifactKind = 'explanation' | 'learning' | 'context' | 'documentation' | 'decision'
export interface Project { id: string; name: string; description: string }
export interface ProjectArtifact {
  id: string; projectId: string; key: string; taskId: string | null; kind: ArtifactKind
  revision: number; readRevision: number; title: string; content: string; author: string
  sourceUrl: string; createdAt: string; updatedAt: string; readAt: string | null
}
export class ProjectError extends Error {
  statusCode: number
  constructor(statusCode: number, message: string) { super(message); this.statusCode = statusCode }
}
const fail = (code: number, message: string): never => { throw new ProjectError(code, message) }
const kinds = new Set(['explanation', 'learning', 'context', 'documentation', 'decision'])
function text(value: unknown, name: string, max: number, optional = false): string {
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) fail(400, `Invalid ${name}`)
  return (value as string).trim()
}

export function migrateProjects(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, description TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS project_artifacts (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, artifact_key TEXT NOT NULL,
      task_id TEXT, kind TEXT NOT NULL, revision INTEGER NOT NULL,
      read_revision INTEGER NOT NULL DEFAULT 0, read_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(project_id, artifact_key));
    CREATE TABLE IF NOT EXISTS project_artifact_revisions (
      artifact_id TEXT NOT NULL, revision INTEGER NOT NULL, title TEXT NOT NULL,
      content TEXT NOT NULL, author TEXT NOT NULL, source_url TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
      PRIMARY KEY(artifact_id, revision));
    CREATE INDEX IF NOT EXISTS project_artifacts_by_project ON project_artifacts(project_id, updated_at DESC);
  `)
  const add = db.prepare('INSERT OR IGNORE INTO projects(id,name,description) VALUES (?,?,?)')
  add.run('si', 'SI', 'Tickets, explanations and project decisions.')
  add.run('sdaha', 'SDAHA', 'Project work, context and learning.')
  add.run('kimo', 'Kimo', 'Your work and learning workspace.')
}

export function projectStore(db: Database.Database) {
  const project = (id: string): Project => db.prepare('SELECT * FROM projects WHERE id=?').get(id) as Project || fail(404, 'Project not found')
  const select = `SELECT a.id, a.project_id AS projectId, a.artifact_key AS key, a.task_id AS taskId,
    a.kind, a.revision, a.read_revision AS readRevision, r.title, r.content, r.author,
    r.source_url AS sourceUrl, a.created_at AS createdAt, a.updated_at AS updatedAt,
    CASE WHEN a.read_revision >= a.revision THEN a.read_at ELSE NULL END AS readAt
    FROM project_artifacts a JOIN project_artifact_revisions r ON r.artifact_id=a.id AND r.revision=a.revision`
  const get = (projectId: string, id: string): ProjectArtifact =>
    db.prepare(select + ' WHERE a.project_id=? AND a.id=?').get(projectId, id) as ProjectArtifact || fail(404, 'Artifact not found')
  function publish(projectId: string, value: unknown, author: string) {
    project(projectId)
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'Expected an artifact')
    const input = value as Record<string, unknown>
    const key = text(input.key, 'artifact key', 160)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_./:-]*$/.test(key)) fail(400, 'Invalid artifact key')
    const title = text(input.title, 'title', 200)
    const content = text(input.content, 'content', 60000)
    const sourceUrl = text(input.sourceUrl ?? '', 'source URL', 2000, true)
    if (sourceUrl) {
      let url: URL
      try { url = new URL(sourceUrl) } catch { fail(400, 'Source must be an HTTP or HTTPS URL') }
      if (!['https:', 'http:'].includes(url!.protocol) || url!.username || url!.password) fail(400, 'Invalid source URL')
    }
    const kind = text(input.kind, 'kind', 30) as ArtifactKind
    if (!kinds.has(kind)) fail(400, 'Invalid artifact kind')
    if (!Number.isInteger(input.expectedRevision) || Number(input.expectedRevision) < 0) fail(400, 'Read the current revision first; use expectedRevision 0 to create')
    const taskId = input.taskId == null ? null : text(input.taskId, 'task ID', 100)
    author = text(author, 'author', 120)
    return db.transaction(() => {
      if (taskId) {
        const task = db.prepare('SELECT project FROM work_items WHERE id=?').get(taskId) as { project: string } | undefined
        if (!task || task.project.toLowerCase() !== project(projectId).name.toLowerCase()) fail(400, 'Task must belong to this project')
      }
      const existing = db.prepare('SELECT id, revision, kind, task_id FROM project_artifacts WHERE project_id=? AND artifact_key=?').get(projectId, key) as { id: string; revision: number; kind: string; task_id: string | null } | undefined
      if ((existing?.revision || 0) !== input.expectedRevision) fail(409, 'Artifact changed. Read the latest revision before updating.')
      if (existing && (existing.kind !== kind || existing.task_id !== taskId)) fail(400, 'Keep the artifact kind and task; use a new key for different work')
      if (existing) {
        const current = get(projectId, existing.id)
        if (current.content === content && current.title === title && current.sourceUrl === sourceUrl) return current
      }
      const id = existing?.id || randomUUID()
      const revision = (existing?.revision || 0) + 1
      const now = new Date().toISOString()
      db.prepare(`INSERT INTO project_artifacts(id,project_id,artifact_key,task_id,kind,revision,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,updated_at=excluded.updated_at`)
        .run(id, projectId, key, taskId, kind, revision, now, now)
      db.prepare('INSERT INTO project_artifact_revisions(artifact_id,revision,title,content,author,source_url,created_at) VALUES (?,?,?,?,?,?,?)')
        .run(id, revision, title, content, author, sourceUrl, now)
      return get(projectId, id)
    })()
  }
  function markRead(projectId: string, id: string, revision: number, read: boolean) {
    return db.transaction(() => {
      const item = get(projectId, id)
      if (!Number.isInteger(revision) || revision < 1 || revision > item.revision) fail(400, 'Invalid read revision')
      if (typeof read !== 'boolean') fail(400, 'Expected read true or false')
      // A client that was reading an older version can acknowledge only that version.
      const next = read ? Math.max(item.readRevision, revision) : 0
      db.prepare('UPDATE project_artifacts SET read_revision=?,read_at=? WHERE id=?').run(next, read ? new Date().toISOString() : null, id)
      return get(projectId, id)
    })()
  }
  return {
    project, publish, get, markRead,
    projects: () => db.prepare('SELECT * FROM projects ORDER BY CASE id WHEN \'si\' THEN 0 WHEN \'sdaha\' THEN 1 ELSE 2 END, name').all() as Project[],
    list: (projectId?: string) => db.prepare(select + (projectId ? ' WHERE a.project_id=?' : '') + ' ORDER BY a.updated_at DESC').all(...(projectId ? [projectId] : [])) as ProjectArtifact[],
    history: (projectId: string, id: string) => {
      get(projectId, id)
      return db.prepare('SELECT revision,title,author,created_at AS createdAt FROM project_artifact_revisions WHERE artifact_id=? ORDER BY revision DESC').all(id)
    },
    revision: (projectId: string, id: string, revision: number) => {
      get(projectId, id)
      return db.prepare('SELECT revision,title,content,author,source_url AS sourceUrl,created_at AS createdAt FROM project_artifact_revisions WHERE artifact_id=? AND revision=?').get(id, revision) || fail(404, 'Revision not found')
    },
  }
}
