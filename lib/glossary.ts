// Pure glossary parser — turns the §17 markdown tables into structured terms.
//
// This is the "enrich into structured data" step: each term is split into its
// *expansion*, *what it is* (general meaning), and *how this app uses it* — the
// distinction the corpus deliberately encodes in prose. The markdown stays the
// source of truth; this only DERIVES structure from it. Per-term corrections
// live in the app-side overrides (lib/glossary-overrides.ts), never in the corpus.
//
// Imported by the API, the glossary page, AND nuxt.config (to build the
// auto-link index), so it must stay free of Nuxt/Nitro runtime imports.

export interface GlossaryTerm {
  term: string
  slug: string
  group: string
  /** Bold expansion from the start of the cell, e.g. FBA -> "Fulfilled by Amazon". */
  expansion: string | null
  /** General definition — "what the thing is". */
  whatIs: string
  /** App-specific usage — "how this app uses it". May be empty. */
  howUsed: string
}

export interface GlossaryOverride {
  expansion?: string | null
  whatIs?: string
  howUsed?: string
}

const GROUP_LABELS: Record<string, string> = {
  'domain terms': 'Domain',
  'internal jargon & abbreviations': 'Internal jargon',
  'technical terms': 'Technical',
}

export function slugify(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Split a meaning cell into { expansion, whatIs, howUsed }. */
export function splitMeaning(meaning: string): {
  expansion: string | null
  whatIs: string
  howUsed: string
} {
  let body = meaning.trim()
  let expansion: string | null = null

  // Leading "**Expansion** — ..." (em/en dash or hyphen).
  const exp = body.match(/^\*\*([^*]+)\*\*\s*[—–-]\s*(.*)$/s)
  if (exp) {
    expansion = exp[1].trim()
    body = exp[2].trim()
  }

  // First sentence = what it is; the rest = how this app uses it.
  // Sentence boundary: period followed by space + a capital/quote/backtick,
  // not preceded by a lone capital (crude initials guard).
  const m = body.match(/^(.*?[.!?])\s+(?=[A-Z"'`])(.*)$/s)
  if (m && m[2].trim()) {
    return { expansion, whatIs: m[1].trim(), howUsed: m[2].trim() }
  }
  return { expansion, whatIs: body, howUsed: '' }
}

/**
 * Parse §17.1 into structured terms. `raw` is the full 17-glossary markdown.
 * `overrides` corrects individual terms (keyed by slug) where the heuristic misses.
 */
export function parseGlossary(
  raw: string,
  overrides: Record<string, GlossaryOverride> = {},
): GlossaryTerm[] {
  const start = raw.indexOf('## 17.1')
  const end = raw.indexOf('## 17.2')
  const body = raw.slice(start, end === -1 ? undefined : end)

  const terms: GlossaryTerm[] = []
  let group = 'General'

  for (const line of body.split('\n')) {
    const trimmed = line.trim()

    const groupMatch = trimmed.match(/^\*\*([^*]+)\*\*\s*[—–-]/)
    if (groupMatch) {
      const key = groupMatch[1].trim().toLowerCase()
      if (GROUP_LABELS[key]) group = GROUP_LABELS[key]
      continue
    }

    if (!trimmed.startsWith('|')) continue
    if (/^\|\s*(Term|Abbrev\.?)\s*\|/i.test(trimmed)) continue
    if (/^\|[\s|:-]+\|?$/.test(trimmed)) continue

    const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim())
    if (cells.length < 2) continue

    const term = cells[0].replace(/\*\*/g, '').trim()
    const meaning = cells[1].trim()
    if (!term || !meaning) continue

    const slug = slugify(term)
    const split = splitMeaning(meaning)
    const ov = overrides[slug] ?? {}

    terms.push({
      term,
      slug,
      group,
      expansion: ov.expansion !== undefined ? ov.expansion : split.expansion,
      whatIs: ov.whatIs ?? split.whatIs,
      howUsed: ov.howUsed ?? split.howUsed,
    })
  }

  return terms
}

/**
 * Build the auto-link index: surface-form -> slug, sorted longest-first so the
 * greediest match wins. Case-sensitive matching (done by the consumer) keeps the
 * domain sense of common words ("Store", "Case") distinct from ordinary prose.
 */
export interface LinkForm {
  form: string
  slug: string
  /** Short plain-text definition for a hover tooltip. */
  title: string
}

export function buildLinkIndex(terms: GlossaryTerm[]): LinkForm[] {
  const forms: LinkForm[] = []
  const seen = new Set<string>()

  for (const t of terms) {
    const title = plain(t.expansion ? `${t.expansion} — ${t.whatIs}` : t.whatIs).slice(0, 160)
    // A term may list several surface forms, e.g. "SP-API / MWS", "core / core2".
    const surfaces = t.term.split(/\s*\/\s*/).map((s) => s.trim())
    for (const s of surfaces) {
      // Skip noisy forms: too short, or concept phrases like "Potential vs actual".
      if (s.length < 2 || /\bvs\b/i.test(s)) continue
      if (seen.has(s)) continue
      seen.add(s)
      forms.push({ form: s, slug: t.slug, title })
    }
  }

  return forms.sort((a, b) => b.form.length - a.form.length)
}

/** Strip inline markdown to plain text (for tooltips). */
function plain(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim()
}
