// Remark plugin: compile an ```eraser``` block to Mermaid at content build time and
// emit the SAME <mermaid-diagram> element remark-mermaid does — so both syntaxes go
// through one renderer, one theme, one component. See lib/eraser.ts for why we
// transpile rather than call Eraser (their renderer is cloud-only, and this content
// must never leave the machine).
//
// Trade-off worth knowing when choosing a fence: ```mermaid``` also renders natively
// in Obsidian, whereas ```eraser``` shows there as a plain code block.
import { eraserToMermaid } from './eraser'

interface Node {
  type: string
  lang?: string | null
  value?: string
  children?: Node[]
  data?: Record<string, unknown>
  [k: string]: unknown
}

export default function remarkEraser() {
  return (tree: Node) => {
    const visit = (node: Node) => {
      if (!node.children) return
      for (const child of node.children) {
        if (child.type === 'code' && child.lang === 'eraser' && typeof child.value === 'string') {
          let compiled: string
          try {
            compiled = eraserToMermaid(child.value)
          } catch {
            continue // malformed — leave the fence alone so the author sees their source
          }
          child.type = 'mermaid'
          child.data = {
            ...(child.data ?? {}),
            hName: 'mermaid-diagram',
            hProperties: { code: compiled },
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
