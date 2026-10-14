# Kimo dashboard design

2026-10-14. Direct implementation requested by Benedict.

## Direction

An orderly personal workspace, with familiar shadcn controls and a calm reading
surface. Preserve Kimo's IBM Plex family and restrained terracotta identity,
but use compact sans-serif headings in task UI; serif belongs to long reading.
Light and dark both have explicit token values. Neutral surfaces, thin rules,
one accent and generous grouping replace decorative dashboards.

## Layout

Desktop: 232px primary sidebar, compact toolbar, content capped near 1200px.
Today has one learning step, an unread-guide list and a smaller work column.
Queue rows carry useful work without KPI tiles. Library shows real notebooks;
planned tracks stay in Learn. A document gets a contextual chapter outline.
Generated guides use a narrow reading measure, three short sections, a source
link and an explicit read/unread control.

Mobile: a compact top bar and five primary destinations, with secondary actions
in a menu. Single-column content; sheets fit the viewport, tables become rows.
Minimum 44px touch controls, visible focus, escape-to-close and focus return.
Short labels fit at 320px; long titles wrap, code scrolls within its own region.

## Components

Use shadcn-vue source components for Button, Input, Textarea, Badge and Sheet,
backed by Reka UI. Lucide supplies icons. Use explicit imports for these
components and semantic shared tokens. Keep existing reader
components, notebook links and coding runtime ownership.

## Information hierarchy

Page title → short purpose → primary action → working content → supporting
context. Every page has one main job. Show real sourced counts only. Reading
counts use “read”; practice and mastery claims require different evidence.
Disconnected integrations are explicit. Avoid a global activity firehose.
Avoid duplicate page labels, decorative symbols and cross-links that repeat the
main navigation. Today should invite one next step without making due counts
feel like debt.

## Behavior

Persist drafts through an explicit save. Keep user input on failure. Disable
duplicate submits while pending. Retry reads without discarding saved state.
Respect reduced motion; hover and focus provide the same affordances.

## Design authority

The user's “lets just build it directly” instruction supersedes a Figma-first
approval gate. Figma identity was checked, but no destination or design was
selected. Browser evidence and this repository are the current design record.
