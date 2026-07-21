import { queryCollection } from '@nuxt/content/server'
import { notebookMeta } from '../../lib/notebooks'
import { getNotebooks } from '../utils/library'

// Lists the notebooks in the library (public metadata + doc count for progress).
export default defineEventHandler(async (event) => {
  const nbs = getNotebooks(event)
  const rows = (await queryCollection(event, 'docs').select('path').all()) as { path?: string }[]
  return {
    notebooks: nbs.map((n) => ({
      ...notebookMeta(n),
      docCount: rows.filter((r) => r.path?.startsWith(`/${n.id}/`)).length,
    })),
  }
})
