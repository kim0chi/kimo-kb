import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { queryCollection } from '@nuxt/content/server'
import { parseGlossary } from '../../lib/glossary'
import { glossaryOverrides } from '../../lib/glossary-overrides'
import { getNotebooks } from '../utils/library'

// Flat search index across every notebook: docs + glossary terms, each tagged with
// its notebook. The ⌘K palette filters this client-side (optionally scoped).
export default defineEventHandler(async (event) => {
  const nbs = getNotebooks(event)
  const rows = (await queryCollection(event, 'docs').select('path', 'title').all()) as {
    path?: string
    title?: string | null
  }[]

  const items: {
    title: string
    path: string
    kind: string
    notebook: string
    notebookTitle: string
  }[] = []

  for (const nb of nbs) {
    for (const r of rows.filter((x) => x.path?.startsWith(`/${nb.id}/`))) {
      items.push({ title: r.title || r.path!, path: r.path!, kind: 'Doc', notebook: nb.id, notebookTitle: nb.title })
    }
    if (nb.glossary) {
      try {
        const raw = await readFile(join(nb.root, nb.glossary), 'utf8')
        for (const t of parseGlossary(raw, glossaryOverrides)) {
          items.push({
            title: t.term,
            path: `/${nb.id}/glossary#${t.slug}`,
            kind: 'Term',
            notebook: nb.id,
            notebookTitle: nb.title,
          })
        }
      } catch {
        /* notebook glossary missing — skip */
      }
    }
  }

  return { items }
})
