import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseGlossary } from '../../lib/glossary'
import { glossaryOverrides } from '../../lib/glossary-overrides'

// Structured glossary: each §17 term split into expansion / what-it-is / how-used.
export default defineEventHandler(async (event) => {
  const { contentRoot } = useRuntimeConfig(event)
  const raw = await readFile(
    join(contentRoot, 'SI_Docs', 'sections', '17-glossary-appendices.md'),
    'utf8',
  )
  return { terms: parseGlossary(raw, glossaryOverrides) }
})
