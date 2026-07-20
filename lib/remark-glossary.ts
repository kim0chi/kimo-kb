import type { LinkForm } from './glossary'

// Remark plugin: auto-link glossary terms in doc bodies so they're clickable
// anywhere in the corpus. Runs at content build time (see nuxt.config).
//
// Policy to avoid noise:
// - Only the FIRST occurrence of each term per document is linked.
// - Matching is case-sensitive against the glossary's own casing, so the domain
//   sense ("Store", "Case") links but ordinary lowercase prose doesn't.
// - Never links inside code, existing links, or headings.

interface Node {
  type: string
  value?: string
  children?: Node[]
  url?: string
  data?: Record<string, unknown>
  [k: string]: unknown
}

const SKIP = new Set(['code', 'inlineCode', 'link', 'linkReference', 'definition', 'heading', 'html'])

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export interface RemarkGlossaryOptions {
  index?: LinkForm[]
}

export default function remarkGlossary(options: RemarkGlossaryOptions = {}) {
  const index = options.index ?? []

  return (tree: Node) => {
    if (!index.length) return

    // Longest-first alternation; word-ish boundaries that respect hyphens/dots.
    const pattern = new RegExp(
      `(?<![\\w-])(${index.map((e) => escapeRe(e.form)).join('|')})(?![\\w-])`,
      'g',
    )
    const bySlug = new Map<string, LinkForm>()
    const byForm = new Map<string, LinkForm>()
    for (const e of index) {
      byForm.set(e.form, e)
      if (!bySlug.has(e.slug)) bySlug.set(e.slug, e)
    }

    const linkedSlugs = new Set<string>()

    const visit = (node: Node) => {
      if (!node.children) return
      const out: Node[] = []
      for (const child of node.children) {
        if (child.type === 'text' && typeof child.value === 'string') {
          out.push(...linkifyText(child.value))
        } else if (SKIP.has(child.type)) {
          out.push(child) // don't descend into code/links/headings
        } else {
          visit(child)
          out.push(child)
        }
      }
      node.children = out
    }

    const linkifyText = (text: string): Node[] => {
      pattern.lastIndex = 0
      const nodes: Node[] = []
      let last = 0
      let m: RegExpExecArray | null
      while ((m = pattern.exec(text))) {
        const entry = byForm.get(m[1])
        if (!entry || linkedSlugs.has(entry.slug)) continue // once per term per doc
        linkedSlugs.add(entry.slug)
        if (m.index > last) nodes.push({ type: 'text', value: text.slice(last, m.index) })
        nodes.push({
          type: 'link',
          url: `/glossary#${entry.slug}`,
          title: entry.title || null,
          data: { hProperties: { class: 'glossary-link', title: entry.title } },
          children: [{ type: 'text', value: m[1] }],
        })
        last = m.index + m[1].length
      }
      if (last === 0) return [{ type: 'text', value: text }]
      if (last < text.length) nodes.push({ type: 'text', value: text.slice(last) })
      return nodes
    }

    visit(tree)
  }
}
