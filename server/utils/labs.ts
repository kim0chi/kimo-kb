import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'

// Code Lab: a lab is a folder you drop into <library>/labs/ —
//
//   labs/two-pointers/
//     lab.md         frontmatter (title, lang, difficulty, tags) + the prompt
//     solution.js    your code (edit it in your editor; the app runs it)
//     tests.js       optional assertions, run against your solution
//
// Nothing is executed here: the server only reads the files. Code runs in the
// browser sandbox (Web Worker for JS/TS, WASM runtimes for the other languages).

export interface Lab {
  id: string
  title: string
  lang: string
  difficulty: string | null
  tags: string[]
  prompt: string
  solution: string
  tests: string | null
  /** Set when the folder exists but has no solution file yet. */
  missingSolution: boolean
}

const EXT: Record<string, string> = {
  js: 'js',
  javascript: 'js',
  ts: 'ts',
  typescript: 'ts',
  python: 'py',
  py: 'py',
  php: 'php',
  sql: 'sql',
}

function readIf(path: string): string | null {
  try {
    return existsSync(path) ? readFileSync(path, 'utf8') : null
  } catch {
    return null
  }
}

/** Split `---\nyaml\n---\nbody` into [frontmatter, body]. */
function splitFrontmatter(raw: string): [Record<string, unknown>, string] {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return [{}, raw]
  try {
    const fm = parseYaml(m[1])
    return [fm && typeof fm === 'object' ? (fm as Record<string, unknown>) : {}, m[2]]
  } catch {
    return [{}, m[2]]
  }
}

function loadLab(dir: string, id: string): Lab | null {
  const labMd = readIf(join(dir, 'lab.md'))
  if (labMd == null) return null
  const [fm, prompt] = splitFrontmatter(labMd)

  const lang = String(fm.lang ?? 'js').toLowerCase()
  const ext = EXT[lang] ?? 'txt'
  const solution = readIf(join(dir, `solution.${ext}`))
  const tests = readIf(join(dir, `tests.${ext}`))

  return {
    id,
    title: String(fm.title ?? id),
    lang,
    difficulty: fm.difficulty ? String(fm.difficulty) : null,
    tags: Array.isArray(fm.tags) ? (fm.tags as string[]).map(String) : [],
    prompt: prompt.trim(),
    solution: solution ?? '',
    tests,
    missingSolution: solution == null,
  }
}

export function labsDir(libraryDir: string): string {
  return join(libraryDir, 'labs')
}

export function loadLabs(libraryDir: string): Lab[] {
  const root = labsDir(libraryDir)
  if (!existsSync(root)) return []
  const out: Lab[] = []
  for (const entry of readdirSync(root)) {
    const dir = join(root, entry)
    try {
      if (!statSync(dir).isDirectory()) continue
    } catch {
      continue
    }
    const lab = loadLab(dir, entry)
    if (lab) out.push(lab)
  }
  return out.sort((a, b) => a.id.localeCompare(b.id))
}

export function loadLabById(libraryDir: string, id: string): Lab | null {
  // Guard against path traversal from the query string.
  if (!/^[a-z0-9][a-z0-9-_]*$/i.test(id)) return null
  return loadLab(join(labsDir(libraryDir), id), id)
}
