import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Notebook } from '../../lib/notebooks'

// Flashcards are authored inline in any doc as a fenced block:
//
//   ```flashcard
//   front of the card (the question / prompt)
//   ---
//   back of the card (the answer)
//   ```
//
// This keeps them in the markdown (Obsidian renders them as a code block) and lets
// review cards live next to the concept they test.

export interface Card {
  id: string
  front: string
  back: string
  doc: string // source doc's H1 (context)
}

const BLOCK = /```flashcard\s*\n([\s\S]*?)```/g

// Stable id from the notebook + front, so review history survives answer edits.
function hashId(nbId: string, front: string): string {
  let h = 5381
  const s = `${nbId}::${front.trim().toLowerCase()}`
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function walkMd(dir: string, out: string[]): void {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walkMd(full, out)
    else if (entry.endsWith('.md')) out.push(full)
  }
}

export function loadCards(nb: Notebook): Card[] {
  const files: string[] = []
  for (const tree of nb.trees) walkMd(tree === '.' ? nb.root : join(nb.root, tree), files)

  const cards: Card[] = []
  const seen = new Set<string>()
  for (const file of files) {
    let raw: string
    try {
      raw = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    if (!raw.includes('```flashcard')) continue
    const docTitle = raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? ''
    for (const m of raw.matchAll(BLOCK)) {
      const body = m[1]
      const sep = body.search(/^\s*---\s*$/m)
      if (sep === -1) continue
      const front = body.slice(0, sep).trim()
      const back = body.slice(body.indexOf('\n', sep) + 1).trim()
      if (!front || !back) continue
      const id = hashId(nb.id, front)
      if (seen.has(id)) continue
      seen.add(id)
      cards.push({ id, front, back, doc: docTitle })
    }
  }
  return cards
}
