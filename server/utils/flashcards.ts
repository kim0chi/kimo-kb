import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Notebook } from '../../lib/notebooks'
import { parseGlossary, plain } from '../../lib/glossary'
import { glossaryOverrides } from '../../lib/glossary-overrides'
import { hashId } from '../../lib/hash'

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

function walkMd(dir: string, out: string[]): void {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walkMd(full, out)
    else if (entry.endsWith('.md')) out.push(full)
  }
}

/**
 * Cards derived from a notebook's glossary — a term is already a question and its
 * definition an answer, so a structured glossary is a ready-made deck. This gives
 * read-only corpora (which we must not edit to add ```flashcard blocks) a deck for
 * free. Cards render as plain text, so markdown is stripped.
 */
function glossaryCards(nb: Notebook): Card[] {
  if (!nb.glossary) return []
  let raw: string
  try {
    raw = readFileSync(join(nb.root, nb.glossary), 'utf8')
  } catch {
    return []
  }
  return parseGlossary(raw, glossaryOverrides).map((t) => {
    const head = t.expansion ? `${plain(t.expansion)} — ${plain(t.whatIs)}` : plain(t.whatIs)
    const back = t.howUsed ? `${head}\n\nIn this app: ${plain(t.howUsed)}` : head
    return {
      id: hashId(nb.id, t.term),
      front: t.term,
      back,
      doc: t.group ? `Glossary · ${t.group}` : 'Glossary',
    }
  })
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

  // Hand-written cards win over a derived one for the same term.
  for (const c of glossaryCards(nb)) {
    if (seen.has(c.id)) continue
    seen.add(c.id)
    cards.push(c)
  }
  return cards
}
