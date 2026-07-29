// Eraser-flavoured diagram DSL → Mermaid source.
//
// Eraser's own renderer is cloud-only — there is no self-hostable one, and their
// API would mean posting internal architecture diagrams to an external service,
// which this corpus must never do. So instead of calling them, we accept the part
// of their diagram-as-code syntax that matters for flow and architecture diagrams
// and compile it to Mermaid, which renders locally.
//
//   direction right|left|down|up   flow direction
//   A > B                          arrow                A --> B
//   A > B: label                   labelled arrow       A -->|"label"| B
//   A < B                          reversed             B --> A
//   A <> B                         bidirectional        A <--> B
//   A > B, C                       fan-out              A --> B and A --> C
//   A > B > C                      chain
//   Group { ... }                  grouping             subgraph (nestable)
//   // comment                     line or trailing comment
//   Name [icon: aws-ec2]           node properties — parsed, then ignored
//
// Display names carry through to the label; the Mermaid id is derived from them.
// Malformed input (an unclosed brace) throws, and the caller leaves the original
// block alone so the author still sees their source.

const DIRECTIONS: Record<string, string> = { right: 'LR', left: 'RL', down: 'TD', up: 'BT' }

interface Group {
  id: string
  title: string
  nodes: string[]
  children: Group[]
}

/** A Mermaid-safe id for a display name. Stable, so repeated mentions line up. */
export function idOf(name: string): string {
  const base = name.replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
  return /^[A-Za-z_]/.test(base) ? base : `n_${base}`
}

/** Quotes would end a Mermaid label early; #quot; is its entity escape. */
function esc(s: string): string {
  return s.replace(/"/g, '#quot;')
}

/**
 * Index of the first `token` that is NOT inside a `[...]` property block, or -1.
 * Property blocks contain colons of their own (`[icon: aws-ec2]`), so a naive
 * indexOf would mistake one for the label separator.
 */
function topLevelIndexOf(line: string, token: string): number {
  let depth = 0
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '[') depth++
    else if (c === ']') depth = Math.max(0, depth - 1)
    else if (depth === 0 && line.startsWith(token, i)) return i
  }
  return -1
}

/**
 * Drop a trailing `// comment`. A label may legitimately contain `//` (a URL), and
 * labels always follow a `:` — so only strip when the `//` comes first.
 */
export function stripComment(line: string): string {
  const slash = topLevelIndexOf(line, '//')
  if (slash === -1) return line
  const colon = topLevelIndexOf(line, ':')
  if (colon !== -1 && colon < slash) return line
  return line.slice(0, slash)
}

/** `Queue [icon: aws-sqs]` → `Queue`. Mermaid has no icon vocabulary to map onto. */
function stripProps(name: string): string {
  return name.replace(/\[[^\]]*\]/g, '').trim()
}

function edgeFor(a: string, b: string, op: string, label: string): string {
  const A = idOf(a)
  const B = idOf(b)
  // Always quote the label: it lets parentheses and commas through untouched.
  const l = label ? `|"${esc(label)}"|` : ''
  if (op === '<') return `${B} -->${l} ${A}`
  if (op === '<>') return `${A} <-->${l} ${B}`
  return `${A} -->${l} ${B}`
}

export function eraserToMermaid(src: string): string {
  let direction = 'TD'
  const root: Group = { id: '', title: '', nodes: [], children: [] }
  const stack: Group[] = [root]
  const edges: string[] = []
  const seen: string[] = [] // every node, in first-seen order
  const grouped = new Set<string>() // nodes that belong to some subgraph

  const note = (name: string) => {
    if (!seen.includes(name)) seen.push(name)
  }
  /** Assign a node to the group currently being read, if any. */
  const place = (name: string) => {
    const g = stack[stack.length - 1]
    if (g === root || grouped.has(name)) return
    g.nodes.push(name)
    grouped.add(name)
  }

  for (const rawLine of src.split('\n')) {
    const line = stripComment(rawLine).trim()
    if (!line) continue

    if (line === '}') {
      if (stack.length === 1) throw new Error('unexpected "}" — no group is open')
      stack.pop()
      continue
    }

    const opens = line.match(/^(.+?)\s*\{$/)
    if (opens) {
      const title = stripProps(opens[1])
      const g: Group = { id: `sg_${idOf(title)}`, title, nodes: [], children: [] }
      stack[stack.length - 1].children.push(g)
      stack.push(g)
      continue
    }

    const dir = line.match(/^direction\s+(\w+)$/i)
    if (dir) {
      direction = DIRECTIONS[dir[1].toLowerCase()] ?? direction
      continue
    }

    if (/<>|>|</.test(line)) {
      const colon = topLevelIndexOf(line, ':')
      // Property blocks are dropped either way, and they contain both colons and
      // commas — so clear them from the connection side before splitting on those.
      const chain = (colon === -1 ? line : line.slice(0, colon)).replace(/\[[^\]]*\]/g, '')
      const label = colon === -1 ? '' : line.slice(colon + 1).trim()

      // Split keeping the operators: "A > B, C" → ["A", ">", "B, C"]
      const parts = chain.split(/(<>|>|<)/).map((s) => s.trim())
      const segs: string[][] = []
      const ops: string[] = []
      parts.forEach((part, i) => {
        if (i % 2 === 0) {
          segs.push(part.split(',').map(stripProps).filter(Boolean))
        } else {
          ops.push(part)
        }
      })

      for (const seg of segs) {
        for (const n of seg) {
          note(n)
          place(n)
        }
      }
      ops.forEach((op, i) => {
        for (const a of segs[i]) {
          for (const b of segs[i + 1] ?? []) edges.push(edgeFor(a, b, op, label))
        }
      })
      continue
    }

    const name = stripProps(line)
    if (!name) continue
    note(name)
    place(name)
  }

  if (stack.length !== 1) throw new Error('unclosed "{" — a group was never closed')

  const out: string[] = [`flowchart ${direction}`]
  const declared = new Set<string>()
  const declare = (name: string, indent: string) => {
    if (declared.has(name)) return
    declared.add(name)
    out.push(`${indent}${idOf(name)}["${esc(name)}"]`)
  }

  // Ungrouped nodes first, then the subgraphs, then every edge.
  for (const n of seen) {
    if (!grouped.has(n)) declare(n, '  ')
  }
  const renderGroup = (g: Group, indent: string) => {
    out.push(`${indent}subgraph ${g.id}["${esc(g.title)}"]`)
    for (const n of g.nodes) declare(n, `${indent}  `)
    for (const child of g.children) renderGroup(child, `${indent}  `)
    out.push(`${indent}end`)
  }
  for (const g of root.children) renderGroup(g, '  ')
  out.push(...edges.map((e) => `  ${e}`))

  return out.join('\n')
}
