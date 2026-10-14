# Kimo personal dashboard

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing Nuxt 4, Vue 3 and TypeScript application; Nuxt Content reads external
Markdown in place, SQLite stores personal state. Adopt shadcn-vue and Tailwind
for shared controls. Retain the existing browser coding runtimes.

## User and purpose

Benedict wants one place to understand and retain what he builds with AI,
resume daily work, manage ideas and tasks, read documentation and develop
engineering and design skills. Learning is the first priority, confirmed
2026-10-14. He works across SI tickets, personal projects and Atelier.

## Confirmed constraints

- Extend Documents/kb and Documents/knowledge; preserve SI Docs as a source.
- Target the existing SI Windows NUC for later hosting; Benedict paused
  deployment to review and simplify the local features first.
- Preserve private local/Tailscale access. OpenAI requests use selected personal
  sources only; the SI and externally rooted notebooks are excluded.
- Use a clean, responsive shadcn interface, with deliberate flows per feature.
- Build directly: Benedict explicitly chose direct implementation over a Figma
  destination selection on 2026-10-14. No Figma design approval is a prerequisite.
- Keep documentation alongside code. Preserve existing document filenames.

## Product principles

1. Today helps choose or resume; detailed work belongs on its dedicated screen.
2. Reading, delivery and demonstrated understanding are separate signals.
3. Ideas can be captured without becoming obligations.
4. Every external status and generated answer needs a source and freshness.
5. AI helps explain and practice; saved attempts show the person's progress.
6. Personal money tracking is manual and private: a spending limit is distinct
   from income, and recorded net flow is distinct from bank balance.

## Existing evidence

The repository contains a notebook reader, roadmap, flashcards, SM-2 scheduling,
written exercises, local notes and browser code labs. Source references in the
old SI manifest and roadmap predate the SI Docs reorganization. This branch adds
append-only exercise attempts and a personal learning journal.

## Delivery boundaries

Current work delivers the dashboard UI foundation, local organization, a learning
record, a manual SGD money tracker, and a source-scoped OpenAI guide maker that saves plain-language guides
as unread until the reader marks them read. Provider calls need a server-side
API key. GitHub/Jira synchronization, semantic
retrieval, full ticket tutoring, and NUC deployment remain recorded milestones.
A disconnected integration must never appear live.

See [the implementation plan](docs/plans/personal-dashboard-plan.md) and
[feature flows](docs/design/workflow/feature-flows.md).
