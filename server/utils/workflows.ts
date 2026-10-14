import { randomUUID } from 'node:crypto'
import { getNote, setNote, useDb } from './db'
import type { WorkItem } from './work-items'

export type WorkflowStatus = 'running' | 'ready' | 'failed'
export interface WorkflowRun {
  id: string
  project: string
  workItemId: string | null
  sourcePath: string
  sourceTitle: string
  focus: string
  status: WorkflowStatus
  artifactId: string | null
  artifactReadAt: string | null
  noteDraft: string
  documentedAt: string | null
  error: string
  createdAt: string
  updatedAt: string
}

type Row = {
  id: string; project: string; work_item_id: string | null
  source_path: string; source_title: string; focus: string
  status: WorkflowStatus; artifact_id: string | null; artifact_read_at: string | null; note_draft: string
  documented_at: string | null; error: string; created_at: string; updated_at: string
}

const fromRow = (row: Row): WorkflowRun => ({
  id: row.id, project: row.project, workItemId: row.work_item_id,
  sourcePath: row.source_path, sourceTitle: row.source_title, focus: row.focus,
  status: row.status, artifactId: row.artifact_id, artifactReadAt: row.artifact_read_at, noteDraft: row.note_draft,
  documentedAt: row.documented_at, error: row.error,
  createdAt: row.created_at, updatedAt: row.updated_at,
})

export function listWorkflowRuns(): WorkflowRun[] {
  // A server restart cannot resume an in-flight provider call. Keep the
  // record, mark it failed, and let the user retry explicitly.
  const cutoff = new Date(Date.now() - 120_000).toISOString()
  useDb().prepare(`UPDATE workflow_runs SET status = 'failed',
    error = 'The guide run was interrupted. Retry it to continue.',
    updated_at = ? WHERE status = 'running' AND updated_at < ?`)
    .run(new Date().toISOString(), cutoff)
  return (useDb().prepare(`SELECT workflow_runs.*, reading_artifacts.read_at AS artifact_read_at
    FROM workflow_runs LEFT JOIN reading_artifacts ON reading_artifacts.id = workflow_runs.artifact_id
    ORDER BY workflow_runs.created_at DESC`).all() as Row[]).map(fromRow)
}

export function getWorkflowRun(id: string): WorkflowRun | null {
  const row = useDb().prepare(`SELECT workflow_runs.*, reading_artifacts.read_at AS artifact_read_at
    FROM workflow_runs LEFT JOIN reading_artifacts ON reading_artifacts.id = workflow_runs.artifact_id
    WHERE workflow_runs.id = ?`).get(id) as Row | undefined
  return row ? fromRow(row) : null
}

export function createWorkflowRun(input: {
  project: string; workItemId: string | null; sourcePath: string
  sourceTitle: string; focus: string
}): WorkflowRun {
  const project = input.project.trim()
  if (!project || project.length > 120 || input.focus.length > 2000) {
    throw createError({ statusCode: 400, statusMessage: 'Use a project name and keep the focus under 2,000 characters.' })
  }
  if (input.workItemId) {
    const linked = useDb().prepare('SELECT id, project FROM work_items WHERE id = ?')
      .get(input.workItemId) as Pick<WorkItem, 'id' | 'project'> | undefined
    if (!linked || linked.project !== project) {
      throw createError({ statusCode: 400, statusMessage: 'The work item must belong to this project.' })
    }
  }
  const id = randomUUID()
  const now = new Date().toISOString()
  useDb().prepare(`INSERT INTO workflow_runs
    (id, project, work_item_id, source_path, source_title, focus, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'running', ?, ?)`)
    .run(id, project, input.workItemId, input.sourcePath, input.sourceTitle, input.focus, now, now)
  return getWorkflowRun(id)!
}

export function finishWorkflowRun(id: string, artifactId: string, content: string): WorkflowRun {
  const run = getWorkflowRun(id)
  if (!run || run.status !== 'running') throw createError({ statusCode: 409, statusMessage: 'This run is no longer active.' })
  const draft = `## AI study draft — ${run.sourceTitle}\n\n${content.trim()}`.slice(0, 12000)
  useDb().prepare(`UPDATE workflow_runs SET status = 'ready', artifact_id = ?,
    note_draft = ?, error = '', updated_at = ? WHERE id = ?`)
    .run(artifactId, draft, new Date().toISOString(), id)
  return getWorkflowRun(id)!
}

export function failWorkflowRun(id: string, message: string): WorkflowRun {
  useDb().prepare(`UPDATE workflow_runs SET status = 'failed', error = ?,
    updated_at = ? WHERE id = ? AND status = 'running'`)
    .run(message.slice(0, 500), new Date().toISOString(), id)
  return getWorkflowRun(id)!
}

export function retryWorkflowRun(id: string): WorkflowRun {
  const now = new Date().toISOString()
  const result = useDb().prepare(`UPDATE workflow_runs SET status = 'running',
    error = '', updated_at = ? WHERE id = ? AND status = 'failed'`)
    .run(now, id)
  if (!result.changes) throw createError({ statusCode: 409, statusMessage: 'Only failed runs can be retried.' })
  return getWorkflowRun(id)!
}

export function applyWorkflowNote(id: string, body: string): WorkflowRun {
  const run = getWorkflowRun(id)
  if (!run) throw createError({ statusCode: 404, statusMessage: 'Workflow not found.' })
  if (run.status !== 'ready' || run.documentedAt) {
    throw createError({ statusCode: 409, statusMessage: 'This draft has already been applied or is not ready.' })
  }
  const draft = body.trim()
  if (!draft || draft.length > 12000) {
    throw createError({ statusCode: 400, statusMessage: 'Keep the note between 1 and 12,000 characters.' })
  }
  const now = new Date().toISOString()
  useDb().transaction(() => {
    const current = getWorkflowRun(id)!
    if (current.documentedAt) throw createError({ statusCode: 409, statusMessage: 'This draft was already applied.' })
    const previous = getNote(run.sourcePath)?.body.trim()
    setNote(run.sourcePath, [previous, draft].filter(Boolean).join('\n\n---\n\n'), now)
    useDb().prepare('UPDATE workflow_runs SET note_draft = ?, documented_at = ?, updated_at = ? WHERE id = ?')
      .run(draft, now, now, id)
  })()
  return getWorkflowRun(id)!
}
