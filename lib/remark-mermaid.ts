// Remark plugin: turn a ```mermaid``` code block into a rendered diagram instead of
// a raw code dump. Runs at content build time (see nuxt.config). It only rewrites the
// node to a custom element — it does NOT import mermaid — so the server build stays
// light and mermaid loads lazily, client-side, in MermaidDiagram.vue.
//
// Mermaid fences render natively in Obsidian too, so a diagram authored here shows
// in both places and the markdown stays pure.

interface Node {
  type: string
  lang?: string | null
  value?: string
  children?: Node[]
  data?: Record<string, unknown>
  [k: string]: unknown
}

export default function remarkMermaid() {
  return (tree: Node) => {
    const visit = (node: Node) => {
      if (!node.children) return
      for (const child of node.children) {
        if (child.type === 'code' && child.lang === 'mermaid' && typeof child.value === 'string') {
          const code = child.value
          // Hand the source to the component as a vdom prop (hProperties), so its
          // newlines and quotes need no escaping; hName maps to the kebab-case
          // component under components/content/ (MermaidDiagram.vue).
          child.type = 'mermaid'
          child.data = {
            ...(child.data ?? {}),
            hName: 'mermaid-diagram',
            hProperties: { code },
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
