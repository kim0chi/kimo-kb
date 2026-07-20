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

The app reads markdown from `KB_CONTENT_ROOT` (default
`/home/evo-benedict/Documents/evo-work`) via a Nuxt Content collection using
`source.cwd` — no symlinks, no copies, corpus untouched. See `content.config.ts`.
Phase 1 includes only the `SI_Docs/**` tree; `notes/` and `decisions/` are added
in later phases from the same root.

## How it's put together

- **Navigation is chapter-based, from `reading-order.md`** — *not* the folder
  layout. `server/utils/reading-order.ts` parses the 7 curated chapters (title,
  ☑/☐ state, "You're done when" criterion) and resolves each chapter's Obsidian
  `[[wikilink]]` to a real content route by basename. Served via `/api/nav`.
  - Chapter 4 ("Architecture Guide") expands into the whole numbered `sections/` set.
  - The folders `to read/` / `done reading/` are the *old* manual tracker and are
    ignored for navigation; the ☑/☐ flags seed initial reading state (Phase 2
    moves state to the DB).
  - One reading-order link (`[[RE-4829-store-selector-mkid]]`) points into
    `notes/`, outside the Phase-1 include, so it shows as unresolved for now.
- **Reader** — `app/pages/[...slug].vue` renders a doc by its content path with
  `<ContentRenderer>`. Code fences, pipe tables, and inline raw HTML all render.
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
