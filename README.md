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
- **Glossary** — `/api/glossary` parses the §17 tables into a filterable term
  index (33 terms across Domain / Internal jargon / Technical). The "what it is"
  vs "how this app uses it" distinction is currently kept as whole-cell prose;
  **Phase 3** enriches these rows into structured fields.
- **Interactive layer (Phase 4)** — `lib/interactive-map.ts` is a **sidecar** map
  of doc-path → component names, kept in this app so the corpus markdown stays
  byte-for-byte unchanged and Obsidian renders it cleanly. The reader shows a
  placeholder where components will mount.

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

## Status

- [x] **Phase 1 — Reader**: external content, chapter nav from reading-order,
      mobile-first layout, glossary, doc rendering.
- [x] **Phase 2 — Reading state**: unread/reading/done in SQLite, replacing the
      folder drag; progress against the reading order.
- [ ] **Phase 3** — structured glossary; terms clickable anywhere in the corpus.
- [ ] **Phase 4** — interactive explainers (request lifecycle, queue pipeline, data model).
- [ ] **Phase 5** — per-doc notes; Tailscale access from phone.
