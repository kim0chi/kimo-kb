import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { queryCollection } from '@nuxt/content/server'
import { parseReadingOrder, buildDocIndex } from '../utils/reading-order'

interface Row {
  path?: string
  title?: string | null
  stem?: string
  ticket?: string
  status?: string
  date?: string
  area?: string
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

// Builds the chapter-based navigation from reading-order.md, resolving each
// chapter's wikilinks against the content collection, plus the notes/decisions sections.
export default defineEventHandler(async (event) => {
  const { contentRoot } = useRuntimeConfig(event)

  const rows = (await queryCollection(event, 'docs')
    .select('path', 'title', 'stem', 'ticket', 'status', 'date', 'area')
    .all()) as Row[]

  const index = buildDocIndex(rows)

  const raw = await readFile(join(contentRoot, 'SI_Docs', 'reading-order.md'), 'utf8')
  const chapters = parseReadingOrder(raw, index)

  return {
    chapters,
    notes: section(rows, '/notes/'),
    decisions: section(rows, '/decisions/'),
    docs: rows
      .map((r) => ({ path: r.path, title: r.title }))
      .sort((a, b) => (a.path || '').localeCompare(b.path || '')),
  }
})
