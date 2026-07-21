import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { queryCollection } from '@nuxt/content/server'
import { parseReadingOrder, buildDocIndex } from '../utils/reading-order'
import { buildTree, buildFlat, collectTags } from '../utils/nav-strategies'
import { getNotebooks } from '../utils/library'
import { notebookById, notebookMeta } from '../../lib/notebooks'

interface Row {
  path?: string
  title?: string | null
  stem?: string
  ticket?: string
  status?: string
  date?: string
  area?: string
  tags?: string[]
  difficulty?: string
  order?: number
}

// Shape the notes/ and decisions/ trees into a nav section: README first, then
// newest-first by frontmatter date; the _TEMPLATE scaffold is excluded.
function section(rows: Row[], prefix: string) {
  return rows
    .filter((r) => r.path?.startsWith(prefix))
    .filter((r) => {
      const last = r.path!.split('/').pop() || ''
      return last !== 'template' && last !== '_template'
    })
    .map((r) => ({
      path: r.path!,
      title: r.title ?? r.path!,
      ticket: r.ticket ?? null,
      status: r.status ?? null,
      date: r.date ?? null,
      area: r.area ?? null,
      isReadme: (r.path!.split('/').pop() || '') === 'readme',
    }))
    .sort((a, b) => {
      if (a.isReadme !== b.isReadme) return a.isReadme ? -1 : 1
      return (b.date ?? '').localeCompare(a.date ?? '') || a.title.localeCompare(b.title)
    })
}

// Navigation for one notebook: chapters (reading-order strategy), plus its
// notes/decisions sections. Other strategies (tree/flat) arrive in Phase 17.
export default defineEventHandler(async (event) => {
  const nbs = getNotebooks(event)
  const nb = notebookById(nbs, (getQuery(event).notebook as string) || null)
  if (!nb) return { notebook: null, chapters: [], notes: [], decisions: [], docs: [] }

  const all = (await queryCollection(event, 'docs')
    .select('path', 'title', 'stem', 'ticket', 'status', 'date', 'area', 'tags', 'difficulty', 'order')
    .all()) as Row[]
  const rows = all.filter((r) => r.path?.startsWith(`/${nb.id}/`))

  let chapters: ReturnType<typeof parseReadingOrder> = []
  let sections: ReturnType<typeof buildTree> = []
  const strategy = nb.nav.strategy
  if (strategy === 'reading-order' && nb.nav.file) {
    const index = buildDocIndex(rows)
    const raw = await readFile(join(nb.root, nb.nav.file), 'utf8')
    chapters = parseReadingOrder(raw, index)
  } else if (strategy === 'tree') {
    sections = buildTree(rows, nb.id)
  } else if (strategy === 'flat') {
    sections = buildFlat(rows)
  }

  return {
    notebook: notebookMeta(nb),
    strategy,
    chapters,
    sections,
    tags: collectTags(rows),
    notes: section(rows, `/${nb.id}/notes/`),
    decisions: section(rows, `/${nb.id}/decisions/`),
    docs: rows
      .map((r) => ({ path: r.path, title: r.title }))
      .sort((a, b) => (a.path || '').localeCompare(b.path || '')),
  }
})
