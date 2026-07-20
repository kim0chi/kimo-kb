// Parses SI_Docs/reading-order.md into the app's navigation model.
//
// The reading order — NOT the folder layout — is the source of truth for nav.
// It defines a curated path of "chapters"; each chapter points at one or more
// docs via Obsidian `[[wikilink|alias]]` syntax, resolved by basename against
// the actual content collection. Chapter 4 ("Architecture Guide") expands into
// the whole numbered sections/ set, so a chapter can hold many docs.

export interface ChapterDoc {
  /** Raw wikilink target, e.g. "01-introduction" or "tech-primer". */
  target: string
  /** Display label from `[[target|alias]]`, or the target if none. */
  alias: string
  /** Resolved content route, e.g. "/si-docs/sections/01-introduction". Null if unresolved. */
  path: string | null
  /** Resolved doc title from the collection, if available. */
  title: string | null
}

export interface Chapter {
  number: number
  title: string
  /** Reading-order checkbox: ☑/☒ => true. Seeds initial reading state (Phase 2 moves this to the DB). */
  done: boolean
  /** The "You're done when:" completion criterion, plain text. */
  doneWhen: string | null
  /** Short descriptive blurb (the prose under the heading, minus the done-when line). */
  blurb: string | null
  docs: ChapterDoc[]
}

const WIKILINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

/** basename (lowercased) -> { path, title } from the content collection. */
export type DocIndex = Map<string, { path: string; title: string | null }>

function stripMd(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(WIKILINK, (_m, t, a) => a || t)
    .trim()
}

/**
 * Parse the "## The path" section of reading-order.md into chapters.
 * `index` resolves wikilink basenames to real content routes.
 */
export function parseReadingOrder(raw: string, index: DocIndex): Chapter[] {
  // Only consider the curated path, not the "## Archive" table below it.
  const pathStart = raw.indexOf('## The path')
  const archiveStart = raw.indexOf('## Archive')
  const body = raw.slice(pathStart, archiveStart === -1 ? undefined : archiveStart)

  // Split into chapter blocks on "### ... Chapter N" headings.
  const blocks = body.split(/\n(?=###\s)/).filter((b) => /^###\s/.test(b.trim()))

  const chapters: Chapter[] = []
  for (const block of blocks) {
    const lines = block.split('\n')
    const heading = lines[0]

    const m = heading.match(/^###\s+([☑☒☐])?\s*Chapter\s+(\d+)\s*[—-]\s*(.+)$/u)
    if (!m) continue
    const done = m[1] === '☑' || m[1] === '☒'
    const number = Number(m[2])
    // Title: cut off decorations like *(...)* and ★ markers.
    const title = m[3]
      .replace(/\*\([^)]*\)\*/g, '')
      .replace(/★.*$/u, '')
      .replace(/\*+/g, '')
      .trim()

    const rest = lines.slice(1).join('\n')

    // Collect every wikilink in the block, in order, de-duplicated.
    const docs: ChapterDoc[] = []
    const seen = new Set<string>()
    for (const wl of rest.matchAll(WIKILINK)) {
      const target = wl[1].trim()
      const key = target.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const hit = index.get(key) || null
      docs.push({
        target,
        alias: (wl[2] || target).trim(),
        path: hit?.path ?? null,
        title: hit?.title ?? null,
      })
    }

    // "You're done when:" criterion.
    const doneWhenMatch = rest.match(/\*\*You'?re done when:\*\*\s*([^\n]+)/i)
    const doneWhen = doneWhenMatch ? stripMd(doneWhenMatch[1]) : null

    // Blurb: first prose line that isn't the 📖 link line or the done-when line.
    const blurbLine = lines
      .slice(1)
      .map((l) => l.trim())
      .find(
        (l) =>
          l &&
          !l.startsWith('📖') &&
          !l.startsWith('>') &&
          !/^\*\*You'?re done when:/i.test(l) &&
          !/^\[\[/.test(l),
      )
    const blurb = blurbLine ? stripMd(blurbLine) : null

    chapters.push({ number, title, done, doneWhen, blurb, docs })
  }

  return chapters.sort((a, b) => a.number - b.number)
}

/** Build the basename index from raw collection rows (path + title). */
export function buildDocIndex(rows: { path?: string; title?: string | null }[]): DocIndex {
  const index: DocIndex = new Map()
  for (const row of rows) {
    if (!row.path) continue
    const base = row.path.split('/').pop()!.toLowerCase()
    // Prefer the first match; wikilinks resolve by basename across the vault.
    if (!index.has(base)) index.set(base, { path: row.path, title: row.title ?? null })
  }
  return index
}
