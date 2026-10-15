import { useDb } from '../utils/db'
import { useProjects } from '../utils/projects'
import { listArtifacts } from '../utils/artifacts'
import type { ReadingItem } from '../../lib/reading'

export default defineEventHandler(() => {
  const db = useDb()
  const sources: ReadingItem[] = listArtifacts().map(item => ({
    id: 'source:' + item.id, title: item.title, project: '', kind: 'learning',
    preview: item.preview, updatedAt: item.createdAt, readAt: item.readAt,
    href: '/briefs/' + item.id, sourceTitle: item.sourceTitle,
  }))
  const jobs = db.prepare(`SELECT id,title,project,substr(guide_content,1,180) AS preview,
    updated_at AS updatedAt, read_at AS readAt FROM agent_jobs WHERE status='ready'`).all() as {
      id: string; title: string; project: string; preview: string; updatedAt: string; readAt: string | null
    }[]
  sources.push(...jobs.map(item => ({ ...item, id: 'job:' + item.id, href: '/agent-jobs/' + item.id, kind: 'learning', sourceTitle: item.project + ' · repository guide' })))
  const store = useProjects()
  const names = new Map(store.projects().map(p => [p.id, p.name]))
  sources.push(...store.list().map(item => ({
    id: 'project:' + item.id, title: item.title, project: names.get(item.projectId) || item.projectId,
    kind: item.kind, preview: item.content.slice(0, 180), updatedAt: item.updatedAt, readAt: item.readAt,
    href: '/projects?project=' + encodeURIComponent(item.projectId) + '&artifact=' + encodeURIComponent(item.id),
    sourceTitle: (names.get(item.projectId) || item.projectId) + ' · ' + item.kind,
  })))
  return { items: sources.sort((a,b) => Number(!!a.readAt) - Number(!!b.readAt) || b.updatedAt.localeCompare(a.updatedAt)) }
})
