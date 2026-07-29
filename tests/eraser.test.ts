import { test } from 'node:test'
import assert from 'node:assert/strict'
import { eraserToMermaid, stripComment, idOf } from '../lib/eraser.ts'

/** Every non-empty line, trimmed — order matters, indentation doesn't. */
function lines(src: string): string[] {
  return eraserToMermaid(src)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

test('a simple arrow becomes a Mermaid edge, with both nodes declared', () => {
  assert.deepEqual(lines('Browser > Server'), [
    'flowchart TD',
    'Browser["Browser"]',
    'Server["Server"]',
    'Browser --> Server',
  ])
})

test('a label after the colon becomes a quoted edge label', () => {
  assert.ok(lines('Browser > Server: HTTPS').includes('Browser -->|"HTTPS"| Server'))
})

test('labels keep parentheses and commas, which quoting makes safe', () => {
  assert.ok(lines('A > B: O(n log n), once').includes('A -->|"O(n log n), once"| B'))
})

test('direction maps onto the Mermaid flowchart direction', () => {
  assert.equal(lines('direction right\nA > B')[0], 'flowchart LR')
  assert.equal(lines('direction up\nA > B')[0], 'flowchart BT')
  assert.equal(lines('direction down\nA > B')[0], 'flowchart TD')
})

test('an unknown direction is ignored rather than emitted', () => {
  assert.equal(lines('direction sideways\nA > B')[0], 'flowchart TD')
})

test('< reverses the arrow', () => {
  assert.ok(lines('A < B').includes('B --> A'))
})

test('<> is bidirectional', () => {
  assert.ok(lines('A <> B').includes('A <--> B'))
})

test('fan-out draws one edge per target', () => {
  const out = lines('LB > Server 1, Server 2')
  assert.ok(out.includes('LB --> Server_1'))
  assert.ok(out.includes('LB --> Server_2'))
})

test('a chain links each consecutive pair', () => {
  const out = lines('A > B > C')
  assert.ok(out.includes('A --> B'))
  assert.ok(out.includes('B --> C'))
  assert.ok(!out.includes('A --> C'))
})

test('display names with spaces get a safe id but keep their label', () => {
  assert.ok(lines('Load Balancer > API').includes('Load_Balancer["Load Balancer"]'))
})

test('a name starting with a digit is prefixed so the id stays valid', () => {
  assert.equal(idOf('3rd party'), 'n_3rd_party')
})

test('a group becomes a subgraph holding its nodes', () => {
  assert.deepEqual(lines('Ingest {\n  Updaters\n  Raw tables\n}'), [
    'flowchart TD',
    'subgraph sg_Ingest["Ingest"]',
    'Updaters["Updaters"]',
    'Raw_tables["Raw tables"]',
    'end',
  ])
})

test('groups nest', () => {
  const out = lines('Outer {\n  Inner {\n    Leaf\n  }\n}')
  assert.deepEqual(out, [
    'flowchart TD',
    'subgraph sg_Outer["Outer"]',
    'subgraph sg_Inner["Inner"]',
    'Leaf["Leaf"]',
    'end',
    'end',
  ])
})

test('an edge written inside a group puts its nodes in that group', () => {
  const out = lines('Pipeline {\n  A > B\n}')
  const sub = out.indexOf('subgraph sg_Pipeline["Pipeline"]')
  const end = out.indexOf('end')
  assert.ok(out.slice(sub, end).includes('A["A"]'), 'A should sit inside the subgraph')
  assert.ok(out.slice(sub, end).includes('B["B"]'), 'B should sit inside the subgraph')
})

test('a node is declared once even when it appears in several edges', () => {
  const out = lines('A > B\nA > C\nB > C')
  assert.equal(out.filter((l) => l === 'A["A"]').length, 1)
  assert.equal(out.filter((l) => l === 'C["C"]').length, 1)
})

test('nodes declared in a group are not re-declared at the root', () => {
  const out = lines('Stage {\n  Worker\n}\nQueue > Worker')
  assert.equal(out.filter((l) => l === 'Worker["Worker"]').length, 1)
  // …and it stays inside the subgraph, before `end`.
  assert.ok(out.indexOf('Worker["Worker"]') < out.indexOf('end'))
})

test('comments are stripped, whole-line and trailing', () => {
  const out = lines('// just a note\nA > B  // and another')
  assert.deepEqual(out, ['flowchart TD', 'A["A"]', 'B["B"]', 'A --> B'])
})

test('a URL in a label survives comment stripping', () => {
  assert.equal(stripComment('A > B: see http://x/y'), 'A > B: see http://x/y')
  assert.ok(lines('A > B: see http://x/y').includes('A -->|"see http://x/y"| B'))
})

test('node properties are accepted and dropped', () => {
  const out = lines('API [icon: aws-ec2, color: blue] > DB [icon: aws-rds]')
  assert.ok(out.includes('API["API"]'))
  assert.ok(out.includes('DB["DB"]'))
  assert.ok(out.includes('API --> DB'))
})

test('a quote in a name is escaped so it cannot end the label early', () => {
  assert.ok(lines('The "edge" case > B').includes('The_edge_case["The #quot;edge#quot; case"]'))
})

test('an unclosed group is an error, so the caller can fall back to the source', () => {
  assert.throws(() => eraserToMermaid('Group {\n  A'), /unclosed/)
})

test('a stray closing brace is an error too', () => {
  assert.throws(() => eraserToMermaid('A > B\n}'), /unexpected/)
})

test('blank input still produces a valid (empty) flowchart', () => {
  assert.deepEqual(lines('\n\n  \n'), ['flowchart TD'])
})
