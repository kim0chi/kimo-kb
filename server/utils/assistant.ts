import { realpathSync } from 'node:fs'
import { relative, isAbsolute } from 'node:path'
import { queryCollection } from '@nuxt/content/server'
import type { H3Event } from 'h3'
import { getNotebooks } from './library'

type Source = { path: string; title: string; notebook: string }
type ContentDoc = { path?: string; title?: string; body?: unknown }

function inside(parent: string, child: string): boolean {
  const rel = relative(parent, child)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

export function allowedNotebookIds(event: H3Event): string[] {
  const library = String(useRuntimeConfig(event).library)
  let libraryRoot: string
  try { libraryRoot = realpathSync(library) } catch { return [] }
  // CS is the reviewed default. Additional personal tracks require an explicit
  // server-side opt-in. External reference manifests can never pass this check.
  const configured = (process.env.KB_AI_ALLOWED_NOTEBOOKS || 'cs')
    .split(',').map(id => id.trim()).filter(Boolean)
  return getNotebooks(event)
    .filter(nb => configured.includes(nb.id) && nb.id !== 'si' && nb.id !== 'manifesto')
    .filter(nb => {
      try { return inside(libraryRoot, realpathSync(nb.root)) } catch { return false }
    })
    .map(nb => nb.id)
}

export async function allowedSources(event: H3Event): Promise<Source[]> {
  const ids = allowedNotebookIds(event)
  if (!ids.length) return []
  const rows = await queryCollection(event, 'docs').select('path', 'title').all() as ContentDoc[]
  return rows
    .filter(row => row.path && ids.some(id => row.path!.startsWith(`/${id}/`)))
    .map(row => ({ path: row.path!, title: row.title || row.path!, notebook: row.path!.split('/')[1] }))
    .sort((a, b) => a.title.localeCompare(b.title))
}

function textOf(node: unknown, out: string[]): void {
  if (typeof node === 'string') { out.push(node); return }
  if (Array.isArray(node)) {
    const children = typeof node[0] === 'string' && node.length > 1 ? node.slice(2) : node
    for (const child of children) textOf(child, out)
    out.push('\n')
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  if (record.value) textOf(record.value, out)
  if (Array.isArray(record.children)) {
    for (const child of record.children) textOf(child, out)
    out.push('\n')
  }
}

export async function sourceDocument(event: H3Event, path: string): Promise<{ source: Source; text: string } | null> {
  const source = (await allowedSources(event)).find(item => item.path === path)
  if (!source) return null
  const doc = await queryCollection(event, 'docs').path(path).first() as ContentDoc | null
  if (!doc?.body) return null
  const chunks: string[] = []
  textOf(doc.body, chunks)
  const text = chunks.join(' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim().slice(0, 12000)
  return text ? { source, text } : null
}
