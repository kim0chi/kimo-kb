import { notebookMeta } from '../../lib/notebooks'
import { getNotebooks } from '../utils/library'

// Lists the notebooks in the library (public metadata only — no filesystem paths).
export default defineEventHandler((event) => {
  return { notebooks: getNotebooks(event).map(notebookMeta) }
})
