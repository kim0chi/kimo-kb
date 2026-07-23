#!/usr/bin/env node
// Scaffold a notebook into the library.
//
//   Register EXTERNAL docs (read in place, e.g. a project's docs folder):
//     npm run add-notebook -- --external <path> [--id x --title "…" --kind project
//                                                --nav tree --trees docs,deploy]
//
//   CREATE a new notebook folder in the library (for content you'll write):
//     npm run add-notebook -- --create <id> [--title "…" --kind guide --nav tree]
//
// nav is auto-detected when omitted: a reading-order.md → reading-order; subfolders
// with markdown → tree; otherwise flat.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'

const LIBRARY = process.env.KB_LIBRARY || join(process.env.HOME || '', 'Documents/knowledge')

function parseArgs(argv) {
  const a = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i]
    if (t.startsWith('--')) {
      const key = t.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        a[key] = next
        i++
      } else a[key] = true
    } else a._.push(t)
  }
  return a
}

function titleize(s) {
  return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim()
}

// Top-level app routes win over /[notebook], so a notebook with one of these ids
// would be created but permanently unreachable.
const RESERVED_IDS = new Set(['learn', 'labs', 'help', 'index', 'api', '_nuxt', '_fonts', 'glossary', 'review', 'exercises'])
function assertUsableId(id) {
  if (!id) {
    console.error('✗ could not derive a notebook id — pass --id')
    process.exit(1)
  }
  if (RESERVED_IDS.has(id)) {
    console.error(`✗ "${id}" is a reserved route — the notebook would be unreachable. Pass a different --id.`)
    process.exit(1)
  }
}

function hasMd(dir, depth = 0) {
  if (!existsSync(dir)) return false
  for (const e of readdirSync(dir)) {
    if (e.startsWith('.')) continue
    const full = join(dir, e)
    const st = statSync(full)
    if (st.isFile() && e.endsWith('.md')) return true
    if (st.isDirectory() && depth < 3 && hasMd(full, depth + 1)) return true
  }
  return false
}

function subfoldersWithMd(dir) {
  return readdirSync(dir).filter((e) => {
    if (e.startsWith('.')) return false
    const full = join(dir, e)
    return statSync(full).isDirectory() && hasMd(full)
  })
}

function detectNav(root, trees) {
  const dirs = trees.map((t) => (t === '.' ? root : join(root, t)))
  for (const d of dirs) if (existsSync(join(d, 'reading-order.md'))) return 'reading-order'
  for (const d of dirs) if (existsSync(d) && subfoldersWithMd(d).length) return 'tree'
  return 'flat'
}

function findGlossary(root, trees) {
  for (const t of trees) {
    const d = t === '.' ? root : join(root, t)
    if (!existsSync(d)) continue
    const hit = readdirSync(d).find((e) => /glossary/i.test(e) && e.endsWith('.md'))
    if (hit) return t === '.' ? hit : `${t}/${hit}`
  }
  return undefined
}

const args = parseArgs(process.argv.slice(2))
if (!existsSync(LIBRARY)) mkdirSync(LIBRARY, { recursive: true })

const trees = args.trees ? String(args.trees).split(',').map((s) => s.trim()) : ['.']

if (args.external) {
  const root = resolve(String(args.external))
  if (!existsSync(root)) {
    console.error(`✗ path not found: ${root}`)
    process.exit(1)
  }
  const id = args.id || basename(root).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  assertUsableId(id)
  const nav = args.nav || detectNav(root, trees)
  const manifest = {
    id,
    title: args.title || titleize(id),
    kind: args.kind || 'project',
    ...(args.order !== undefined ? { order: Number(args.order) } : {}),
    root,
    trees,
    nav: nav === 'reading-order' ? { strategy: 'reading-order', file: 'reading-order.md' } : { strategy: nav },
    ...(findGlossary(root, trees) ? { glossary: findGlossary(root, trees) } : {}),
  }
  const out = join(LIBRARY, `${id}.kb.json`)
  writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`✓ registered "${manifest.title}" (${nav}) → ${out}\n  root: ${root}\n  trees: ${trees.join(', ')}`)
} else if (args.create) {
  const id = String(args.create).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  assertUsableId(id)
  const dir = join(LIBRARY, id)
  if (existsSync(join(dir, 'kb.json'))) {
    console.error(`✗ notebook already exists: ${dir}`)
    process.exit(1)
  }
  mkdirSync(dir, { recursive: true })
  const nav = args.nav || 'tree'
  const manifest = {
    id,
    title: args.title || titleize(id),
    kind: args.kind || 'guide',
    ...(args.order !== undefined ? { order: Number(args.order) } : {}),
    trees: ['.'],
    nav: nav === 'reading-order' ? { strategy: 'reading-order', file: 'reading-order.md' } : { strategy: nav },
  }
  writeFileSync(join(dir, 'kb.json'), JSON.stringify(manifest, null, 2) + '\n')
  if (!existsSync(join(dir, 'index.md'))) {
    writeFileSync(join(dir, 'index.md'), `# ${manifest.title}\n\nStart adding docs here.\n`)
  }
  console.log(`✓ created notebook "${manifest.title}" (${nav}) → ${dir}\n  drop markdown into ${dir}/ and restart the dev server.`)
} else {
  console.log('Usage:\n  npm run add-notebook -- --external <path> [--id --title --kind --nav --trees]\n  npm run add-notebook -- --create <id>   [--title --kind --nav]')
  process.exit(1)
}
