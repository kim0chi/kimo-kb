# kb — the SI Handbook reader

A private, mobile-friendly reader over the existing markdown corpus in the
`evo-work` repo. Markdown stays the source of truth; this app only **reads** it
(never copies, moves, or writes) and — from Phase 2 — stores reading state,
notes, and a term index in a local SQLite DB.

> **Access:** local + Tailscale only. The corpus is company-internal architecture
> documentation and must never go on a public host. Pages are marked
> `noindex, nofollow`; do not deploy this to any public URL.

## Stack

- **Nuxt 4** + **Nuxt Content v3** — markdown + Vue components + server routes in one app.
- **better-sqlite3** — Content's index now; app state (reading status, notes) in Phase 2.
- **Node 22 LTS**, pinned per-project via `mise.toml` (your global Node 26 broke a
  webpack build once and is newer than Nuxt supports — this repo stays on 22).

## Setup

```bash
mise install            # installs Node 22.23.1 (from mise.toml)
cp .env.example .env    # then edit KB_CONTENT_ROOT if your path differs
mise exec -- npm install
mise exec -- npm run dev
```

Open http://localhost:3000.

## Content source (external, in place)

### The notebook library (Phase 15)

The app is a **library of notebooks** (knowledge bases), not a single handbook.
`KB_LIBRARY` (default `~/Documents/knowledge`) is a directory the app scans for:

- a **folder** with a `kb.json` manifest (a self-describing notebook), or
- a **`*.kb.json` reference manifest** pointing at an external, read-only root — how
  the SI Handbook stays in `evo-work` untouched while living in the library
  (`~/Documents/knowledge/si.kb.json`).

A manifest declares `{ id, title, kind, root, trees, nav, glossary }`. `lib/notebooks.ts`
loads them; `content.config.ts` generates one `docs` collection whose sources are
each notebook's trees, read in place with an explicit `prefix` so **paths are
namespaced per notebook** (e.g. `/si/si-docs/...`, `/si/notes/...`). If the library is
empty, a built-in SI notebook (using `KB_CONTENT_ROOT`) is the fallback.

`/api/notebooks` lists them; `/api/nav?notebook=<id>` and `/api/glossary?notebook=<id>`
are notebook-scoped. Adding a knowledge base = drop a folder or manifest in the library.

**Adding a notebook** — `npm run add-notebook -- --external <path> …` registers
external docs in place (a `*.kb.json` reference), or `--create <id>` scaffolds a new
notebook folder in the library. It auto-detects the nav strategy (reading-order file
→ `reading-order`, subfolders → `tree`, else `flat`). The `tree` strategy groups by
full folder path, so nested docs (`docs/adr`, `docs/research-loop`) become their own
sections.

**Routing (Phase 16):** `/` is the **library shelf**; `/<id>` is a notebook's home;
`/<id>/glossary` its glossary; `/<id>/<tree>/<…>` a doc. The sidebar has a notebook
switcher, and ⌘K searches the whole library (`/api/search`) with a this-notebook/all
scope toggle. Old pre-notebook URLs 302-redirect (see `server/middleware`).

## How it's put together

- **Navigation is chapter-based, from `reading-order.md`** — *not* the folder
  layout. `server/utils/reading-order.ts` parses the 7 curated chapters (title,
  ☑/☐ state, "You're done when" criterion) and resolves each chapter's Obsidian
  `[[wikilink]]` to a real content route by basename. Served via `/api/nav`.
  - Chapter 4 ("Architecture Guide") expands into the whole numbered `sections/` set.
  - The folders `to read/` / `done reading/` are the *old* manual tracker and are
    ignored for navigation; the ☑/☐ flags seed initial reading state (Phase 2
    moves state to the DB).
  - Wikilinks resolve across all three trees, so cross-tree links (e.g. Chapter 7's
    `[[RE-4829-store-selector-mkid]]`, which lives in `notes/`) resolve.
- **Reader** — `app/pages/[...slug].vue` renders a doc by its content path with
  `<ContentRenderer>`. Code fences, pipe tables, and inline raw HTML all render.
  Notes/decisions show a frontmatter meta bar (ticket, status, area, date, tags).
- **Working notes & Decisions** — the `notes/` and `decisions/` trees appear as
  their own nav sections (README first, then newest-first by date; `_TEMPLATE`
  excluded), with status badges. `/api/nav` builds them.
- **Glossary** — structured; see below.
- **Interactive layer** — bespoke explainers rendered above a doc; see below.

## Reading state (Phase 2)

Reading status (`unread` / `reading` / `done`) is stored per doc in a local
SQLite DB — this replaces dragging files between `to read/` and `done reading/`.

- **DB**: `data/kb.sqlite` (gitignored), path overridable via `KB_STATE_DB`.
  Holds state only, keyed by content path; never any corpus content.
- **API**: `GET /api/state` → `{ states: { path: status } }` (absent = `unread`);
  `POST /api/state` `{ path, status }` to set one. `server/utils/db.ts` owns the schema.
- **Seed**: on first run, current progress is imported once from the old tracker —
  anything in `done reading/` starts as `done` (guarded by a `meta` flag; the
  folders are ignored forever after).
- **UI**: a status control on each doc; opening an unread doc auto-marks it
  `reading`; the home page shows an overall progress bar and per-chapter counts;
  the nav shows a status dot per doc. State is shared reactively via
  `useReadingState()` with optimistic updates.

## Glossary (Phase 3)

The §17 tables are parsed into **structured** terms, and terms are **clickable
anywhere in the corpus**.

- **Structure** (`lib/glossary.ts`, pure) — each term is split into `expansion`,
  `whatIs` (general meaning) and `howUsed` (how *this app* uses it — the
  distinction the corpus encodes in prose). The markdown stays the source of
  truth; this only derives structure. Served by `GET /api/glossary`.
- **Hand-tuning** — where the heuristic split misses, correct that one term in
  `lib/glossary-overrides.ts` (keyed by slug). Corpus stays untouched.
- **Auto-linking** (`lib/remark-glossary.ts`) — a remark plugin links the first
  occurrence of each term per doc to `/glossary#slug`, with a hover tooltip.
  Case-sensitive (so "Store"/"Case" link in their domain sense, not in ordinary
  prose); never links inside code, existing links, or headings. The link index
  is built from §17 at config load — **restart the dev server after editing the
  glossary** to rebuild it.
- **Glossary page** shows the what-is / how-used split with per-term anchors.

## Interactive explainers (Phase 4)

Bespoke, dependency-free Vue explainers render at the top of specific docs — the
markdown alone can't carry some concepts. Deliberately a **few high-value ones**,
not one per doc.

- **Mapping** — `lib/interactive-map.ts` (sidecar) maps a doc content-path to
  explainer ids; the corpus markdown stays byte-for-byte untouched.
- **Registry** — `app/components/interactive/registry.ts` resolves ids to
  components. The reader renders them via `<component :is>`.
- **Shipped** (all grounded in the actual source docs):
  - `request-lifecycle` (§9) — steps the server⟷browser round trip through this
    app's real middleware stack; toggles between a page load and a Vue API call.
  - `queue-pipeline` (§10) — dispatch jobs and watch them flow App → Redis →
    Horizon worker → Done/Failed, with the real supervisor pools and the
    `retry_after > timeout` invariant.
  - `data-model` (§6) — a clickable entity map with lenses for the tenancy spine,
    case aggregate, and the Store → CaseSummary → CaseSummaryAmazonCase →
    AllReimbursement money trail.
- **Add one**: build `app/components/interactive/Foo.vue`, register it under an id,
  and add the id to the doc's entry in the sidecar map.

## Notes (Phase 5)

Private per-doc notes, stored in the same local SQLite DB (state only, never in
the corpus).

- **Storage** — a `notes` table in `data/kb.sqlite`; an empty note deletes its row.
- **API** — `GET /api/notes?path=…` returns one note; `GET /api/notes` returns the
  list of paths that have notes (for indicators); `POST /api/notes` `{ path, body }`
  saves or clears.
- **UI** — a Notes panel at the foot of each doc with debounced autosave (and save
  on blur); the nav shows a ✎ flag on docs that have notes.

## Phone access over Tailscale

The content is company-internal — **never put it on a public host**. There is no
login; **the network is the security boundary** (local + Tailscale only), and
pages are `noindex`. Access it from your phone on your tailnet:

1. **Tailscale** — install it on this machine and your phone, `sudo tailscale up`,
   then `tailscale ip -4` for this machine's `100.x.y.z` (enable MagicDNS for a name).
2. **Run bound to the network:**
   - Quick (dev): `mise exec -- npm run dev:host` → open the printed Network URL.
   - Persistent (built): `mise exec -- npm run build` then
     `HOST=0.0.0.0 PORT=3000 mise exec -- npm run serve`.
   - Open `http://<this-machine>.<tailnet>.ts.net:3000` (MagicDNS) or `http://100.x.y.z:3000`.
3. **Strict (Tailscale-only, no LAN exposure)** — bind to the Tailscale IP instead
   of `0.0.0.0`: `mise exec -- npm run dev -- --host 100.x.y.z`, or
   `HOST=100.x.y.z PORT=3000 mise exec -- npm run serve`.

`KB_CONTENT_ROOT` still points at the local corpus; nothing content-bearing leaves
this machine.

## Design tokens (Phase 8)

All colour lives in one semantic token layer in `app/app.vue` (`:root`), never as
raw hex in components. Tokens separate three concerns that used to be tangled:
**brand/interactive** (`--accent`), **status** (`--good` / `--warning` /
`--serious` / `--critical` — reserved, always paired with a glyph or label), and
**diagram roles** (`--role-server` / `--role-browser`, a categorical pair). Every
hue is checked with the dataviz skill's method (contrast + CVD) before it lands;
status hues ship with secondary encoding, and `StatusDot` distinguishes state by
**shape** (ring / disc / check), not colour alone.

The palette is the **Claude / Anthropic warm theme (Phase 13)**: a **terracotta**
accent (`#da7756` dark, `#b0492a` light — both clear AA text contrast), warm
charcoal / parchment surfaces, warm ivory / ink text. The diagram pair is
terracotta **browser** vs a cool **teal** server — a complementary pairing that's
CVD-safe against the warm accent. `--serious` is a distinct amber so it never
reads as the accent.

**Light mode (Phase 9)** is a *selected* token set (`:root[data-theme='light']`),
not an auto-flip — each hue re-validated against the light surfaces (status tokens
double as badge text, so they clear AA 4.5:1 there; `on-*` inks flip to white).
The topbar toggle persists to `localStorage`; an inline head script applies the
stored/`prefers-color-scheme` choice before first paint (no flash). `useTheme()`
drives it.

## Typography (Phase 12)

The **IBM Plex superfamily**, self-hosted via `@nuxt/fonts` (downloaded and served
locally — no runtime CDN request): **Plex Sans** for UI/body (Zed's UI font),
**Plex Serif** for headings + the brand (editorial/notebook feel), **Plex Mono**
for code. Wired through `--font-ui` / `--font-serif` / `--font-mono` tokens; `h1/h2`
are serif and `code/pre` mono globally. First `dev`/`build` needs network once to
fetch the fonts; after that they're cached and served from `/_fonts/`.

## Status

- [x] **Phase 1 — Reader**: external content, chapter nav from reading-order,
      mobile-first layout, glossary, doc rendering.
- [x] **Phase 2 — Reading state**: unread/reading/done in SQLite, replacing the
      folder drag; progress against the reading order.
- [x] **Phase 3 — Glossary**: structured what-is/how-used split; terms clickable
      anywhere in the corpus.
- [x] **Phase 4 — Interactive explainers**: request lifecycle, queue pipeline,
      data model — mapped via the sidecar.
- [x] **Phase 5 — Notes + phone access**: per-doc notes in SQLite; Tailscale
      access from phone (host binding + no-public-host guidance).
- [x] **Phase 6 — Notes & decisions trees**: `notes/` and `decisions/` folded into
      the collection with their own nav sections + frontmatter meta; resolves the
      cross-tree wikilink.
- [x] **Phase 7 — Build cleanup**: aliased the glossary remark plugin so the
      `remark-glossary` resolve warning is gone.
- [x] **Phase 8 — Design tokens & validated colour**: one semantic token layer,
      validator-checked hues, status by shape+colour (not colour alone).
- [x] **Phase 9 — Light mode**: a selected, re-validated light token set; topbar
      toggle, persisted, no-flash init.
- [x] **Phase 10 — Reading experience & nav**: prev/next chapter paging with the
      "You're done when" checkpoint, A−/A+ text-size control (persisted),
      scroll-progress bar, collapsible nav chapters, typography pass.
- [x] **Phase 11 — Explainer & viz polish**: hover/focus-driven detail + keyboard
      access + legend on the data-model map, a state legend on the queue pipeline,
      refined progress-bar marks (recessive track, rounded fill, per-chapter bars,
      progressbar ARIA), and a global keyboard focus ring.
- [x] **Phase 12 — Typography**: self-hosted IBM Plex superfamily (Sans/Serif/Mono),
      serif headings, mono code; font tokens.
- [x] **Phase 13 — Claude warm palette**: terracotta accent on parchment/warm-charcoal
      surfaces, warm ink, teal↔terracotta diagram roles — re-checked for contrast + CVD.
- [x] **Phase 14 — Notebook layout & nav**: ⌘K quick-jump/search over all docs + terms,
      breadcrumbs, an in-page "On this page" TOC with scroll-spy, and a notebook margin
      rule. (The ⌘K search closes the original brief's "search" item.)
- [x] **Phase 15 — Notebook library**: multi-notebook model + library scan, namespaced
      content per notebook, notebook-aware nav/glossary APIs, `/api/notebooks`, and a
      one-time state-key migration. (SI Handbook is the first notebook.)
- [x] **Phase 16 — Library home + switching**: a library shelf at `/` (notebook cards
      with progress), each notebook at `/<id>` with the reader under it, a sidebar
      notebook switcher, Library › Notebook › … breadcrumbs, per-notebook glossary, and
      a cross-library ⌘K search with a this-notebook/all scope toggle.
- [x] **Phase 17 — Nav strategies + tags**: a notebook's `nav.strategy` can be
      `reading-order` (curated chapters), `tree` (folders → sections, for guides/project
      docs), or `flat` (notes, newest-first). Frontmatter `tags` + `difficulty` surface
      as filter chips and colour-coded badges. Drop a folder-structured notebook with
      `"nav": { "strategy": "tree" }` and it just works — no reading-order.md needed.
- [x] **Phase 18 — Flashcards & spaced repetition**: author cards inline in any doc
      with a fenced ```flashcard``` block (front `---` back); review at `/<id>/review`
      with Again/Hard/Good/Easy grading and SM-2 scheduling (`lib/srs.ts`); due counts
      on the shelf and sidebar; state in SQLite.
- [ ] **Phase 19** — Code Lab (runnable JS/TS blocks + katas; WASM langs later).
- [ ] **Phase 20** — Exercises (prompt → reveal → attempt → confidence).
