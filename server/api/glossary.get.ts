import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Parses the §17 glossary tables into a term index.
//
// Phase 1: term + full meaning + group, filterable. The "what it is" vs
// "how this app uses it" split (currently prose inside the Meaning cell) is
// left whole here; Phase 3 enriches these rows into structured fields.

interface Term {
  term: string
  meaning: string
  group: string
}

const GROUP_LABELS: Record<string, string> = {
  'domain terms': 'Domain',
  'internal jargon & abbreviations': 'Internal jargon',
  'technical terms': 'Technical',
}

export default defineEventHandler(async (event) => {
  const { contentRoot } = useRuntimeConfig(event)
  const raw = await readFile(
    join(contentRoot, 'SI_Docs', 'sections', '17-glossary-appendices.md'),
    'utf8',
  )

  // Only the glossary (17.1), not the appendices below it.
  const start = raw.indexOf('## 17.1')
  const end = raw.indexOf('## 17.2')
  const body = raw.slice(start, end === -1 ? undefined : end)

  const terms: Term[] = []
  let group = 'General'

  for (const line of body.split('\n')) {
    const trimmed = line.trim()

    // Group label lines, e.g. "**Domain terms** — the vocabulary ...".
    const groupMatch = trimmed.match(/^\*\*([^*]+)\*\*\s*[—-]/)
    if (groupMatch) {
      const key = groupMatch[1].trim().toLowerCase()
      if (GROUP_LABELS[key]) group = GROUP_LABELS[key]
      continue
    }

    // Table rows: | **Term** | Meaning |  (skip header + separator rows).
    if (!trimmed.startsWith('|')) continue
    if (/^\|\s*(Term|Abbrev\.?)\s*\|/i.test(trimmed)) continue
    if (/^\|[\s|:-]+\|?$/.test(trimmed)) continue

    const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim())
    if (cells.length < 2) continue

    const term = cells[0].replace(/\*\*/g, '').trim()
    const meaning = cells[1].trim()
    if (term && meaning) terms.push({ term, meaning, group })
  }

  return { terms }
})
