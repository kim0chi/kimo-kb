import { randomUUID } from 'node:crypto'
import { useDb } from './db'

export type AgentJobStatus = 'queued' | 'running' | 'ready' | 'failed' | 'cancelled'
export interface AgentJob {
  id: string
  project: string
  provider: 'codex' | 'claude'
  workItemId: string | null
  title: string
  brief: string
  status: AgentJobStatus
  runnerId: string | null
  branch: string | null
  commitHash: string | null
  worktreePath: string | null
  guideContent: string
  docsContent: string
  error: string
  cancelRequested: boolean
  readAt: string | null
  createdAt: string
  updatedAt: string
}
export type AgentJobSummary = Omit<AgentJob, 'guideContent' | 'docsContent'>
type Row = {
  id: string; provider: 'codex' | 'claude'; project: string; work_item_id: string | null; title: string; brief: string
  status: AgentJobStatus; runner_id: string | null; branch: string | null; commit_hash: string | null; worktree_path: string | null
  guide_content: string; docs_content: string; error: string; cancel_requested: number
  read_at: string | null; created_at: string; updated_at: string
}
type RunnerRow = { id: string; projects_json: string; providers_json: string; seen_at: string }

const fromRow = (row: Row): AgentJob => ({
  id: row.id, project: row.project, provider: row.provider, workItemId: row.work_item_id,
  title: row.title, brief: row.brief, status: row.status, runnerId: row.runner_id,
  branch: row.branch, commitHash: row.commit_hash, worktreePath: row.worktree_path, guideContent: row.guide_content,
  docsContent: row.docs_content, error: row.error, cancelRequested: !!row.cancel_requested,
  readAt: row.read_at, createdAt: row.created_at, updatedAt: row.updated_at,
})

function textField(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw createError({ statusCode: 400, statusMessage: `Enter a ${label} under ${max} characters.` })
  }
  return value.trim()
}
function validRunnerId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid runner ID.' })
  }
  return value
}
function runnerProjects(row: RunnerRow): string[] {
  try {
    const parsed: unknown = JSON.parse(row.projects_json)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch { return [] }
}

export function listRunners() {
  const rows = useDb().prepare('SELECT * FROM agent_runners ORDER BY seen_at DESC').all() as RunnerRow[]
  const recent = Date.now() - 60_000
  return rows.map(row => ({
    id: row.id, projects: runnerProjects(row), providers: JSON.parse(row.providers_json) as string[], seenAt: row.seen_at,
    online: Date.parse(row.seen_at) > recent,
  }))
}

function expireAgentJobs() {
  // No automatic replay: the prior writing agent may have left files in its
  // reserved worktree. Surface interruption and keep that branch for review.
  const cutoff = new Date(Date.now() - 120_000).toISOString()
  useDb().prepare(`UPDATE agent_jobs SET status = 'failed',
    error = 'Runner stopped reporting. Inspect its reserved worktree before creating another job.',
    updated_at = ? WHERE status = 'running' AND updated_at < ?`)
    .run(new Date().toISOString(), cutoff)
}

export function listAgentJobs(): AgentJobSummary[] {
  expireAgentJobs()
  return (useDb().prepare('SELECT * FROM agent_jobs ORDER BY created_at DESC LIMIT 200').all() as Row[])
    .map(row => {
      const { guideContent: _guideContent, docsContent: _docsContent, ...summary } = fromRow(row)
      return summary
    })
}

export function getAgentJob(id: string): AgentJob | null {
  expireAgentJobs()
  const row = useDb().prepare('SELECT * FROM agent_jobs WHERE id = ?').get(id) as Row | undefined
  return row ? fromRow(row) : null
}

export function queueAgentJob(input: unknown): AgentJob {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw createError({ statusCode: 400, statusMessage: 'Expected an agent job.' })
  }
  const body = input as Record<string, unknown>
  const provider = body.provider ?? 'codex'
  if (provider !== 'codex' && provider !== 'claude') throw createError({ statusCode: 400, statusMessage: 'Choose Codex or Claude.' })
  const project = textField(body.project, 'project', 120)
  const title = textField(body.title, 'title', 200)
  const brief = textField(body.brief, 'brief', 8000)
  if (!listRunners().some(runner => runner.projects.includes(project) && runner.providers.includes(provider))) {
    throw createError({ statusCode: 400, statusMessage: 'No runner has registered this agent for the project.' })
  }
  const workItemId = typeof body.workItemId === 'string' && body.workItemId ? body.workItemId : null
  if (workItemId) {
    const item = useDb().prepare('SELECT project FROM work_items WHERE id = ?').get(workItemId) as { project: string } | undefined
    if (!item || item.project !== project) {
      throw createError({ statusCode: 400, statusMessage: 'The linked task must belong to this project.' })
    }
  }
  const id = randomUUID()
  const now = new Date().toISOString()
  useDb().prepare(`INSERT INTO agent_jobs
    (id, project, provider, work_item_id, title, brief, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?)`)
    .run(id, project, provider, workItemId, title, brief, now, now)
  return getAgentJob(id)!
}

export function registerRunner(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw createError({ statusCode: 400, statusMessage: 'Expected runner details.' })
  }
  const body = input as Record<string, unknown>
  const id = validRunnerId(body.id)
  if (!Array.isArray(body.projects) || body.projects.length < 1 || body.projects.length > 20) {
    throw createError({ statusCode: 400, statusMessage: 'Runner needs 1–20 projects.' })
  }
  const projects = [...new Set(body.projects.map(item => textField(item, 'project', 120)))]
  const providers = body.providers ?? ['codex']
  if (!Array.isArray(providers) || !providers.length || providers.length > 2 || providers.some(item => !['codex', 'claude'].includes(item))) {
    throw createError({ statusCode: 400, statusMessage: 'Runner needs supported agent providers.' })
  }
  const seenAt = new Date().toISOString()
  useDb().prepare(`INSERT INTO agent_runners (id, projects_json, providers_json, seen_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET projects_json = excluded.projects_json, providers_json = excluded.providers_json, seen_at = excluded.seen_at`)
    .run(id, JSON.stringify(projects), JSON.stringify(providers), seenAt)
  return { id, projects, providers, seenAt }
}

export function claimAgentJob(runnerId: unknown): AgentJob | null {
  const id = validRunnerId(runnerId)
  const db = useDb()
  return db.transaction(() => {
    const runner = db.prepare('SELECT * FROM agent_runners WHERE id = ?').get(id) as RunnerRow | undefined
    if (!runner || Date.parse(runner.seen_at) < Date.now() - 60_000) {
      throw createError({ statusCode: 409, statusMessage: 'Register this runner before claiming a job.' })
    }
    if (db.prepare(`SELECT 1 FROM agent_jobs WHERE runner_id = ? AND status = 'running'`).get(id)) return null
    const projects = runnerProjects(runner)
    if (!projects.length) return null
    const providers: string[] = JSON.parse(runner.providers_json)
    const providerSlots = providers.map(() => '?').join(',')
    const placeholders = projects.map(() => '?').join(',')
    const row = db.prepare(`SELECT id FROM agent_jobs
      WHERE status = 'queued' AND project IN (${placeholders}) AND provider IN (${providerSlots})
      ORDER BY created_at ASC LIMIT 1`).get(...projects, ...providers) as { id: string } | undefined
    if (!row) return null
    db.prepare(`UPDATE agent_jobs SET status = 'running', runner_id = ?,
      updated_at = ? WHERE id = ? AND status = 'queued'`)
      .run(id, new Date().toISOString(), row.id)
    return getAgentJob(row.id)
  })()
}

export function heartbeatAgentJob(runnerId: unknown, jobId: string) {
  const id = validRunnerId(runnerId)
  const job = getAgentJob(jobId)
  if (!job || job.runnerId !== id || job.status !== 'running') {
    throw createError({ statusCode: 409, statusMessage: 'This job is not running on that runner.' })
  }
  const now = new Date().toISOString()
  useDb().prepare('UPDATE agent_jobs SET updated_at = ? WHERE id = ?').run(now, jobId)
  useDb().prepare('UPDATE agent_runners SET seen_at = ? WHERE id = ?').run(now, id)
  return { cancelRequested: job.cancelRequested }
}

export function finishAgentJob(runnerId: unknown, jobId: string, input: unknown): AgentJob {
  const id = validRunnerId(runnerId)
  const job = getAgentJob(jobId)
  if (!job || job.runnerId !== id || job.status !== 'running') {
    throw createError({ statusCode: 409, statusMessage: 'This job is not running on that runner.' })
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw createError({ statusCode: 400, statusMessage: 'Expected a job result.' })
  }
  const body = input as Record<string, unknown>
  const status = body.status
  if (!['ready', 'failed', 'cancelled'].includes(String(status))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid job result.' })
  }
  const guide = status === 'ready' ? textField(body.guideContent, 'guide', 12000) : ''
  const docs = status === 'ready' ? textField(body.docsContent, 'documentation draft', 12000) : ''
  const branch = typeof body.branch === 'string' ? body.branch.slice(0, 200) : ''
  const commitHash = typeof body.commitHash === 'string' && /^[0-9a-f]{40}$/.test(body.commitHash) ? body.commitHash : ''
  const worktree = typeof body.worktreePath === 'string' ? body.worktreePath.slice(0, 2000) : ''
  if (status === 'ready' && (job.cancelRequested || branch !== 'agent/learning-' + jobId || !commitHash || !worktree.startsWith('/'))) {
    throw createError({ statusCode: 409, statusMessage: 'A ready job needs its expected branch, commit and worktree, and must not be stopping.' })
  }
  const error = status === 'ready' ? '' : typeof body.error === 'string' ? body.error.slice(0, 1000) : 'The agent did not finish.'
  useDb().prepare(`UPDATE agent_jobs SET status = ?, guide_content = ?, docs_content = ?,
    branch = ?, commit_hash = ?, worktree_path = ?, error = ?, updated_at = ? WHERE id = ?`)
    .run(status, guide, docs, branch, commitHash, worktree, error, new Date().toISOString(), jobId)
  return getAgentJob(jobId)!
}

export function cancelAgentJob(id: string): AgentJob {
  const job = getAgentJob(id)
  if (!job) throw createError({ statusCode: 404, statusMessage: 'Agent job not found.' })
  if (job.status === 'queued') {
    useDb().prepare(`UPDATE agent_jobs SET status = 'cancelled', updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), id)
  } else if (job.status === 'running') {
    useDb().prepare('UPDATE agent_jobs SET cancel_requested = 1, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), id)
  } else {
    throw createError({ statusCode: 409, statusMessage: 'This job has already finished.' })
  }
  return getAgentJob(id)!
}

export function setAgentJobRead(id: string, read: boolean): AgentJob {
  const result = useDb().prepare('UPDATE agent_jobs SET read_at = ? WHERE id = ? AND status = \'ready\'')
    .run(read ? new Date().toISOString() : null, id)
  if (!result.changes) throw createError({ statusCode: 404, statusMessage: 'Ready artifact not found.' })
  return getAgentJob(id)!
}
