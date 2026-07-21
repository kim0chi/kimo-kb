// Nav builders for the `tree` and `flat` strategies (guides, project docs, notes).
// The `reading-order` strategy lives in reading-order.ts.

export interface NavRow {
  path?: string
  title?: string | null
  status?: string
  ticket?: string
  date?: string
  tags?: string[]
  difficulty?: string
  order?: number
}

export interface NavDoc {
  path: string
  title: string
  status: string | null
  date: string | null
  tags: string[]
  difficulty: string | null
}

export interface NavSection {
  id: string
  title: string
  docs: NavDoc[]
}

const META = new Set(['readme', 'index', 'template', '_template'])
function isMeta(path: string): boolean {
  return META.has((path.split('/').pop() || '').toLowerCase())
}

function toNavDoc(r: NavRow): NavDoc {
  return {
    path: r.path!,
    title: r.title || r.path!,
    status: r.status ?? null,
    date: r.date ?? null,
    tags: r.tags ?? [],
    difficulty: r.difficulty ?? null,
  }
}

function prefixNum(s: string): number {
  const m = s.match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY
}

function titleize(seg: string): string {
  const t = seg
    .replace(/^\d+[-_.\s]*/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
  return t || seg
}

// Numeric prefix first (01-, 02-), then alphabetical.
function ordered<T>(items: T[], key: (t: T) => string): T[] {
  return [...items].sort((a, b) => prefixNum(key(a)) - prefixNum(key(b)) || key(a).localeCompare(key(b)))
}

const base = (path: string) => path.split('/').pop() || ''

/** Group docs by their folder path within the notebook (nested folders included). */
export function buildTree(rows: NavRow[], nbId: string): NavSection[] {
  const pfx = `/${nbId}/`
  const groups = new Map<string, NavRow[]>()
  for (const r of rows) {
    if (!r.path || isMeta(r.path)) continue
    const parts = r.path.slice(pfx.length).split('/')
    const folder = parts.slice(0, -1).join('/') // '' for root-level docs
    if (!groups.has(folder)) groups.set(folder, [])
    groups.get(folder)!.push(r)
  }
  const sections = [...groups.entries()].map(([folder, rs]) => ({
    id: folder || '_root',
    title: folder ? folder.split('/').map(titleize).join(' / ') : 'Ungrouped',
    docs: ordered(rs.map(toNavDoc), (d) => base(d.path)),
  }))
  return ordered(sections, (s) => (s.id === '_root' ? 'zzz~' : s.id))
}

/** A single list, newest-first by date then title. */
export function buildFlat(rows: NavRow[]): NavSection[] {
  const docs = rows
    .filter((r) => r.path && !isMeta(r.path))
    .map(toNavDoc)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.title.localeCompare(b.title))
  return docs.length ? [{ id: 'all', title: 'All', docs }] : []
}

export function collectTags(rows: NavRow[]): string[] {
  const set = new Set<string>()
  for (const r of rows) for (const t of r.tags ?? []) set.add(t)
  return [...set].sort()
}
