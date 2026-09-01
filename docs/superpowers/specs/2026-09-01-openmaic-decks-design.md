# Decks — presenting a doc as an OpenMAIC classroom

Phase 21. A second, presentational view of any doc: the same markdown rendered as
a slide deck, ending each section with the flashcards and exercises that already
test it. Decks are documents in the [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC)
DSL, so they leave kb intact (PPTX export, other OpenMAIC tooling) rather than
being a kb-only shape.

No LLM is involved. A deck is *derived* from the doc's own structure, the way
flashcards are derived from a glossary and exercises from roadmap objectives.

## Why the OpenMAIC DSL

`@openmaic/dsl` is the contract half of the OpenMAIC SDK: types, JSON Schema
artifacts, pure validators, and pure `normalize*` defaulters. It has **zero
runtime dependencies** and no React. MIT.

We take the DSL and nothing else. The rest of the SDK does not fit:

- `@openmaic/renderer` and `@openmaic/editor` are React; kb is Vue.
- `@openmaic/generation` is the LLM pipeline. kb makes no network calls and the
  SI corpus must not leave the machine.
- `@openmaic/importer` (PPTX in) and PPTX export are future options the DSL keeps
  open. Neither is in scope here.

Pin `@openmaic/dsl@0.11.0` (`DSL_VERSION` `0.3.0`). It is the only new dependency.

### What we use from it

| Export | Use |
| --- | --- |
| `Stage` | The deck: id, name, description, timestamps. |
| `Scene`, `SceneCore`, `SceneType` | One page. `type` is bound to `content`. |
| `SlideContent`, `Slide`, `SlideTheme` | The canvas and its theme. |
| `PPTElement` + variants | Positioned content on a slide. |
| `QuizContent`, `QuizQuestion` | Quiz scenes. Geometry-free. |
| `InteractiveContent` | Diagram scenes (`widgetType: 'diagram'`). |
| `isTextElement`, `isCodeElement`, … | Renderer dispatch. |
| `normalizeElement`, `normalizeSlide`, `normalizeScene`, `normalizeStage` | Fill required defaults so the builder emits only what it knows. |
| `validateStage`, `validateScene` | Boundary check before anything reaches the renderer. |

Deliberately unused: `Action` (playback verbs — nothing autoplays), `PBLContent`,
`MultiAgentConfig`, `GeneratedAgentConfig`, `VoiceDesign`, `AgentVoiceConfig`,
`whiteboard`, `videoManifest`, `animations`. Emitting none of them is valid; they
are optional in the contract.

### The canvas is resolution-independent

`Slide` carries `viewportSize` (1000) and `viewportRatio` (0.5625). Element
`left/top/width/height` are in that virtual space, not pixels. The renderer wraps
the stage in `transform: scale(containerWidth / viewportSize)`, so one canvas
model serves the framed view, the full-bleed view and a phone.

## Slide splitting

**One scene per `##` section, splitting on overflow.**

Walk the doc's block AST. Open a scene at each `##`. Append blocks to the current
scene until the height budget is spent, then open a continuation scene carrying
the same title. A table or a fenced code block that does not fit the remaining
budget starts its own scene rather than being cut.

`#` (the doc H1) plus the lead paragraph becomes the title scene. Blocks before
the first `##` join it.

Rejected: one scene per section with no splitting (tables and code end up
cramped on a fixed canvas) and one scene per block (a five-minute read becomes
~24 slides, many of them a bare heading).

### Height budgeting is estimated, not measured

The builder runs on the server, where there is no layout engine to measure text.
It estimates block height from character count, the element's `textType` font
size, and the content column width.

This is the main technical risk in the design. The estimate will sometimes be
wrong: a slide slightly overfull, or a split one block early. Both are pure
functions with cheap tests, so the budget constants are easy to tune against real
docs. Measuring in the browser and re-splitting client-side is the fallback if
estimation proves unusable; it is not worth its complexity in a first version.

## Block → element mapping

| Markdown | Element / scene | Notes |
| --- | --- | --- |
| `#` + lead | Title scene | `textType: 'title'` / `'subtitle'`. |
| `##` | Scene title | `textType: 'title'`; continuations repeat it. |
| `###` | `PPTTextElement` | `textType: 'itemTitle'`. |
| Paragraph | `PPTTextElement` | `textType: 'content'`. `content` is an HTML string. |
| List | One `PPTTextElement` per item | `textType: 'item'`. |
| Table | `PPTTableElement` | Header row flagged. |
| Fenced code | `PPTCodeElement` | `language` from the fence info string. |
| Blockquote | `PPTTextElement` + `PPTShapeElement` rule | The callout treatment. |
| ` ```mermaid ` / ` ```eraser ` | Interactive scene | `widgetType: 'diagram'`, SVG in `html`. |
| ` ```flashcard ` | Quiz scene | Removed from the slide flow; see below. |
| Image | `PPTImageElement` | |

Inline markdown (bold, code spans, links) becomes HTML inside
`PPTTextElement.content`, which is an HTML string by contract.

### Diagrams

`InteractiveContent` carries `html` (an HTML document the OpenMAIC renderer shows
via iframe `srcDoc`) and `widgetType`. A Mermaid or eraser diagram becomes an
interactive scene with the rendered SVG in `html` and `widgetType: 'diagram'`.

The document stays portable, and kb's renderer special-cases
`widgetType: 'diagram'` to draw the SVG inline rather than pay for an iframe.
Diagrams render client-side at view time; freezing a deck inlines the SVG into
the stored JSON.

## Quiz scenes

Flashcards and exercises belonging to the doc become `QuizContent` scenes placed
at the end of the section they came from. `QuizQuestion.type` is `short_answer`
for both; `analysis` holds the model answer.

Grading in a deck writes the **same rows** `/review` and `/exercises` write.
Question ids come from the existing `hashId(ns, question)` — no new id scheme, no
new table, no second schedule. The deck posts to the existing
`/api/flashcards` and `/api/exercises` endpoints.

This is the deck earning its place in a retrieval-first app. Reading a prettier
version of a doc you have already read is worth little; being checked at the end
of each section is the thing kb is already built around.

### Required change to existing code

`Card` (in `server/utils/flashcards.ts`) records the source doc's H1 in `doc`,
not its content path, so there is no way to ask which cards belong to a doc. Add
`docPath: string` to `Card` and populate it in `loadCards()`. Exercises map to a
doc through an authored exercise's `refs` and a derived one's roadmap-step
`learn` paths.

## Storage: derived, with freeze

The house pattern: derived by default, authored wins.

1. `<library>/decks/<notebook>/<tree>/<…>.stage.json` — if present, use it. The
   path mirrors the doc's content path with its leading `/<notebook>/` stripped,
   so `/cs/complexity/big-o` freezes to
   `<library>/decks/cs/complexity/big-o.stage.json`.
2. Otherwise build from the doc and cache in SQLite against a hash of the source.
   The hash invalidates the cache when the doc changes.

`npm run freeze-deck -- /<notebook>/<tree>/<slug>` writes the built deck to (1)
for hand-editing or export. Frozen decks live under the **library**, never in a
notebook's root — the SI corpus is read-only and must stay untouched.

New table:

```sql
CREATE TABLE IF NOT EXISTS decks (
  doc_path    TEXT PRIMARY KEY,
  source_hash TEXT NOT NULL,
  payload     TEXT NOT NULL,   -- JSON: { stage, scenes }
  updated_at  TEXT NOT NULL
);
```

This is a cache of derived content, not corpus content — consistent with the rule
that the DB holds app state only. It is safe to delete.

## Theming

`SlideTheme` is filled from kb's design tokens: `themeColors: [accent,
role-server]`, `fontColor` from `--text`, `backgroundColor` from `--panel`,
`fontName` from the Plex stack.

The renderer styles by **`textType`**, not by an element's raw `defaultColor` /
`defaultFontName`. Decks therefore follow the light/dark toggle and the reading
typography. The raw fields are still emitted and valid, so a deck imported from
PPTX — which does carry per-element colours — renders correctly through the same
components.

## Presentation

Framed by default, promotable to full-bleed.

- A **Read / Present** toggle at the top of `[notebook]/[...slug].vue`. Present
  renders the deck in the reading column; sidebar, breadcrumbs, status control and
  ⌘K all stay.
- **⤢** promotes the player to full-bleed; **Esc** returns it to the frame.
- **← / →** page. A pip strip shows position, with quiz scenes marked in the
  `role-server` teal so they read as a different kind of stop.
- The framed view shows `Slide.script` (speaker notes) below the canvas. Full-bleed
  hides it.

One component at two sizes, not two players.

## Components

```
lib/deck-build.ts          AST + cards + exercises -> Stage + Scene[]   (pure)
lib/deck-layout.ts         blocks -> positioned PPTElement[]            (pure)
server/utils/decks.ts      resolve frozen | derived, cache, validate
server/api/deck.get.ts     GET /api/deck?path=…
scripts/freeze-deck.mjs    write a built deck to <library>/decks/

app/components/deck/
  DeckPlayer.vue           paging, keyboard, framed <-> full-bleed
  SlideCanvas.vue          scale wrapper + absolute element positioning
  SlideText.vue            text / title / item / itemTitle
  SlideCode.vue            PPTCodeElement
  SlideTable.vue           PPTTableElement
  SlideShape.vue           rules and callout backing
  DiagramScene.vue         widgetType: 'diagram'
  QuizScene.vue            QuizContent, grading through existing endpoints
```

Changed: `server/utils/flashcards.ts` (`docPath`), `server/utils/db.ts` (`decks`
table), `app/pages/[notebook]/[...slug].vue` (toggle), `package.json`.

`deck-build` and `deck-layout` hold no I/O and no Vue, so they are unit-testable
and can be reasoned about without the app running.

## Data flow

```
doc markdown
  -> Nuxt Content AST
  -> deck-build (+ cards, exercises)
  -> deck-layout
  -> normalizeScene / normalizeStage
  -> validateStage / validateScene
  -> SQLite cache
  -> /api/deck
  -> DeckPlayer
```

A frozen deck short-circuits from `deck-build` to the cache, entering at
`validate`.

## Error handling

- A doc with no usable content yields a one-slide deck (title only), not an error.
- Validation failure logs the `ValidationIssue` `path` and `message`, and the
  Present toggle falls back to the reading view. It never throws into the page.
- A frozen deck that fails validation is ignored with a warning and the derived
  deck is used, so a bad hand-edit cannot take a doc down.
- Mermaid that fails to parse yields a scene showing the fence source as code —
  the same failure posture `MermaidDiagram.vue` already has.

## Testing

`node:test`, matching the existing suite.

- **Splitting** — a section under budget stays one scene; over budget splits with
  the title repeated; a table or code block too large for the remainder starts its
  own scene.
- **Mapping** — each block type produces the expected element type and `textType`.
- **Quiz placement** — cards land in the section they were authored in; ids match
  `hashId()` exactly, so schedules cannot drift from `/review`.
- **Contract round-trip** — every scene built from every doc in the library passes
  `validateScene`, and every stage passes `validateStage`. This is the test that
  keeps the portability claim honest; it fails loudly if a DSL upgrade tightens
  the schema.
- **Layout invariants** — no element extends past the viewport bounds; no two
  elements in a scene overlap.

Not covered by automated tests: whether a slide *looks* right at a given size.
That needs a human looking at real docs, and the budget constants will be tuned
that way.

## Out of scope

LLM generation of any kind. Multi-agent playback, TTS, ASR. PPTX import and
export (the DSL keeps both open; neither is built here). Editing a deck in the
app — hand-editing means editing frozen JSON. Decks spanning more than one doc.

## Open risk

The height estimate (see above) is the one place this design can disappoint. If
tuning the constants against real docs does not produce decks that look right,
the fallback is client-side measurement and re-splitting, which is a meaningful
increase in complexity and would be its own phase.
