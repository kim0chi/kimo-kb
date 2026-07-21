import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseGlossary } from '../../lib/glossary'
import { glossaryOverrides } from '../../lib/glossary-overrides'
import { getNotebooks } from '../utils/library'
import { notebookById } from '../../lib/notebooks'

// Structured glossary for a notebook (if it declares one). Each §17 term is split
// into expansion / what-it-is / how-used.
export default defineEventHandler(async (event) => {
  const nb = notebookById(getNotebooks(event), (getQuery(event).notebook as string) || null)
  if (!nb?.glossary) return { terms: [] }

  const raw = await readFile(join(nb.root, nb.glossary), 'utf8')
  return { terms: parseGlossary(raw, glossaryOverrides) }
})
