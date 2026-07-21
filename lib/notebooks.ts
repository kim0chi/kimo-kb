// The notebook (knowledge-base) model + a loader that scans the library.
//
// A "library" is a directory the app points at (KB_LIBRARY). Inside it, a notebook
// is either a folder with a `kb.json` manifest, or a `*.kb.json` reference manifest
// pointing at an external, read-only root (this is how the SI Handbook stays in the
// evo-work repo, untouched, while living in the library). If the library is empty
// or missing, a built-in SI notebook is used so the app works out of the box.
//
// Node-only (uses fs); imported by content.config and the server, never the client.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export type NavStrategy = 'reading-order' | 'tree' | 'flat'

export interface Notebook {
  id: string
  title: string
  description?: string
  kind: string // handbook | guide | project | notes
  root: string // absolute content root
  trees: string[] // subdirs of root to include ('.' = the whole root)
  nav: { strategy: NavStrategy; file?: string }
  glossary?: string // path to a glossary markdown file, relative to root
  order?: number
}

/** Slug used for a tree segment in content paths, e.g. "SI_Docs" -> "si-docs". */
export function treeSlug(tree: string): string {
  return tree.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** The URL/content-path prefix for one of a notebook's trees. */
export function treePrefix(nb: Notebook, tree: string): string {
  return tree === '.' ? `/${nb.id}` : `/${nb.id}/${treeSlug(tree)}`
}

function normalize(raw: Record<string, unknown>, fallbackId: string): Notebook {
  const trees = Array.isArray(raw.trees) && raw.trees.length ? (raw.trees as string[]) : ['.']
  return {
    id: (raw.id as string) || fallbackId,
    title: (raw.title as string) || fallbackId,
    description: raw.description as string | undefined,
    kind: (raw.kind as string) || 'notes',
    root: raw.root as string,
    trees,
    nav: (raw.nav as Notebook['nav']) || { strategy: 'tree' },
    glossary: raw.glossary as string | undefined,
    order: raw.order as number | undefined,
  }
}

const SI_FALLBACK = (root: string): Notebook => ({
  id: 'si',
  title: 'SI Handbook',
  description: 'SellerInvestigators architecture handbook, notes & decisions.',
  kind: 'handbook',
  root,
  trees: ['SI_Docs', 'notes', 'decisions'],
  nav: { strategy: 'reading-order', file: 'SI_Docs/reading-order.md' },
  glossary: 'SI_Docs/sections/17-glossary-appendices.md',
})

export function loadNotebooks(libraryDir: string, fallbackRoot: string): Notebook[] {
  const out: Notebook[] = []
  if (libraryDir && existsSync(libraryDir)) {
    for (const entry of readdirSync(libraryDir)) {
      const full = join(libraryDir, entry)
      try {
        const st = statSync(full)
        if (st.isFile() && entry.endsWith('.kb.json')) {
          out.push(normalize(JSON.parse(readFileSync(full, 'utf8')), entry.replace(/\.kb\.json$/, '')))
        } else if (st.isDirectory() && existsSync(join(full, 'kb.json'))) {
          out.push(normalize({ root: full, ...JSON.parse(readFileSync(join(full, 'kb.json'), 'utf8')) }, entry))
        }
      } catch {
        /* skip malformed manifest */
      }
    }
  }
  if (!out.length && fallbackRoot) out.push(SI_FALLBACK(fallbackRoot))
  // Only keep notebooks whose root actually exists.
  return out
    .filter((n) => n.root && existsSync(n.root))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title))
}

export function notebookById(nbs: Notebook[], id?: string | null): Notebook | undefined {
  return (id && nbs.find((n) => n.id === id)) || nbs[0]
}

/** Public metadata for the client (no filesystem paths leak). */
export function notebookMeta(n: Notebook) {
  return { id: n.id, title: n.title, description: n.description ?? null, kind: n.kind }
}
