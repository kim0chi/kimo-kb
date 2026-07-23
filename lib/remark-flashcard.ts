// Remark plugin: render an inline ```flashcard``` block as a "quiz yourself" card
// in the doc body — the question shown, the answer behind a reveal — instead of a
// raw code block that spoils the answer. Runs at content build time (see nuxt.config).
//
// The SAME blocks are also read straight off disk by server/utils/flashcards.ts to
// build the review deck; that regex extraction is independent of this transform, so
// a card both tests you in context AND joins the spaced-repetition deck.
//
// The fenced block is `front` / `---` / `back`, matching the deck's own parser:
//
//   ```flashcard
//   What does `ref` wrap?
//   ---
//   A single value, in a reactive `.value` container.
//   ```

interface Node {
  type: string
  lang?: string | null
  value?: string
  children?: Node[]
  data?: Record<string, unknown>
  [k: string]: unknown
}

function splitCard(value: string): { front: string; back: string } | null {
  const sep = value.search(/^\s*---\s*$/m)
  if (sep === -1) return null
  const front = value.slice(0, sep).trim()
  const back = value.slice(value.indexOf('\n', sep) + 1).trim()
  if (!front || !back) return null
  return { front, back }
}

export default function remarkFlashcard() {
  return (tree: Node) => {
    const visit = (node: Node) => {
      if (!node.children) return
      for (const child of node.children) {
        if (child.type === 'code' && child.lang === 'flashcard' && typeof child.value === 'string') {
          const card = splitCard(child.value)
          if (!card) continue // leave a malformed block as-is (renders as code)
          // Hand front/back to the component as vdom props (hProperties), so their
          // markdown/quotes/newlines need no escaping. hName maps to the kebab-case
          // component under components/content/ (InlineFlashcard.vue).
          child.type = 'flashcard'
          child.data = {
            ...(child.data ?? {}),
            hName: 'inline-flashcard',
            hProperties: { front: card.front, back: card.back },
          }
          child.children = []
          delete child.value
          delete child.lang
        } else {
          visit(child)
        }
      }
    }
    visit(tree)
  }
}
