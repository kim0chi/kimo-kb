import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { queryCollection } from '@nuxt/content/server'
import { parseReadingOrder, buildDocIndex } from '../utils/reading-order'

// Builds the chapter-based navigation from reading-order.md, resolving each
// chapter's wikilinks against the actual content collection.
export default defineEventHandler(async (event) => {
  const { contentRoot } = useRuntimeConfig(event)

  // All docs, for wikilink resolution + a "browse everything" fallback list.
  const rows = await queryCollection(event, 'docs')
    .select('path', 'title', 'stem')
    .all()

  const index = buildDocIndex(rows)

  const raw = await readFile(join(contentRoot, 'SI_Docs', 'reading-order.md'), 'utf8')
  const chapters = parseReadingOrder(raw, index)

  return {
    chapters,
    docs: rows
      .map((r) => ({ path: r.path, title: r.title }))
      .sort((a, b) => (a.path || '').localeCompare(b.path || '')),
  }
})
