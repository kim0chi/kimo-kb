# Feature flows

2026-10-14. This is the behavior contract for the dashboard. The implementation
plan distinguishes the current UI foundation from later integrations.

## Shared rules

- One main action per page. Preserve the selected task/context when moving to
  its document, exercise or source.
- Navigation changes location; tabs change the current page's view.
- Desktop has persistent primary navigation. Mobile gives the same destinations
  without a nested navigation maze; secondary actions live in a menu.
- Capture is always reachable. Detailed forms belong in a sheet with a clear
  save action, visible errors and keyboard focus return.
- Every list has loading, empty, filtered-empty, failed-load and populated states.
- Every mutation has pending, saved and retryable failure states.
- A reading status is labeled as reading; “mastered” cannot be inferred.
- No streak debt or automatically scheduled obligation from an idea.

## Today

Entry: app root, opening the app, returning after a session.

1. Show a short welcome and a clear continue/start learning action.
2. Resume current reading or choose the next available roadmap item.
3. Offer due review as a secondary action; show an honest count from schedules.
4. Show a bounded list of active personal tasks and a link to the complete queue.
5. Capture a thought without navigating away.

Saved result: existing reading/review state and local work items. Later:
LearningSession and resume note. First use shows meaningful start actions without
fake activity. Mobile stacks learning before work; no compressed dashboard grid.

## Learn

Entry: Today, primary navigation, a work item's “Learn this” action (later).

1. Choose continue, a track, recall practice or a coding lab.
2. Open a roadmap step with its objective and source references.
3. Read/explain, then move to the linked practice.
4. Save attempt and grade; revisit on the existing schedule.

The current roadmap displays reading progress. Upcoming ticket sessions follow
problem → code flow → prediction → attempt → feedback → recall. Full answers
remain available; hint usage is recorded honestly.
Error: missing source identifies the unavailable reference and offers other
available steps; preserve position. Mobile uses one task pane at a time.

## Learning journal

Entry: Today, secondary navigation, or the end of a learning session.

1. Name one concept and explain it in your own words; an open question and source
   link are optional.
2. Save explicitly; failed saves keep the draft in the sheet.
3. Revisit dated explanations alongside immutable graded exercise attempts.

The journal records evidence of thinking. A grade remains self-assessed, and
an entry is not treated as proof of mastery. The initial version shows the
exercise ID when no prompt metadata is available.

## Work and projects

Entry: primary navigation, Today queue, promoted idea.

1. Filter by status/project, or add a task.
2. Enter a title; project, notes and source link are optional.
3. Set queued / active / waiting / done. Waiting captures the reason in notes.
4. Reopen an item to edit; completing is reversible.
5. Later, connect source records and show their independent statuses.

The first version groups labeled items by project and shows counts by personal
status. These counts are not GitHub or Jira progress.

Saved result: a stable local WorkItem with timestamps. Task state is personal;
it does not update GitHub or Jira. Cards/rows show real content, project and status,
with detail in a sheet. Mobile becomes a readable list with full-width detail.
External GitHub sync has a setup state until connected.

## Money

Entry: Today link, secondary navigation, or the mobile menu.

1. Choose the month; current Singapore month opens first.
2. Set, change or clear that month's SGD spending limit.
3. Add an expense or income with amount, date and category; note is optional.
4. Review spending against the limit and income minus expenses separately.
5. Edit an entry or remove it with an inline confirmation.

The limit applies only to expenses. A month without a limit says so explicitly;
zero is a valid limit. Net is the flow recorded in this app, not a bank balance.
All entries and limits are manual local SQLite state, included in the existing
state backup. There is no bank connection, import, currency conversion or AI
access to money data. Mobile uses a single column and the existing five-link
bottom navigation; Money stays reachable through Today and the menu.

## Ideas

Entry: global Capture → idea, secondary navigation.

1. Record a title and optional thought/source.
2. Keep it in an inbox without a due date.
3. Review and promote it to a queued task, preserving ID and notes.
4. Archive when no longer useful; offer a reversible status change.

Saved result: an idea WorkItem, then a task if promoted. No automatic deadlines,
notifications or exercise generation. Empty state invites quick capture.

## Library and documentation

Entry: navigation, global search, concept/source link.

1. Choose notebook or search.
2. Open the source with title, section outline and reading controls.
3. Read, follow cross-links, take notes, open a relevant lab/review.
4. For eligible personal CS sources, make a guide with that document selected;
   read it later from Guides and inspect its canonical source link.

Existing notebook paths remain canonical. Search currently lists titles and
glossary terms; document full-text/semantic search is a separate milestone.
Mobile puts the chapter outline in a sheet, while the document occupies the page.
The graph will be an optional Library view with query-scoped relationships;
never a default wall of nodes on Today.

## Studio / Atelier

Entry: primary navigation or a design project.

1. Choose a focused practice: hierarchy, typography, layout or interaction.
2. Capture its brief as a design item.
3. Attach a reference link; document what you notice and what you will recreate.
4. Save rationale and critique notes; move it through the work stages.
5. Later: attach before/after screenshots and link .atelier artifacts.

Saved result: a design WorkItem in the first version; dedicated comparison/
critique evidence later. Phone supports reference review and notes; desktop
supports implementation and visual comparison.

## Agent

Entry: “Make a plain-language guide” from an eligible personal document, or
“Make a guide” from the Guides reading list.

1. Show the eligible personal sources and whether the server has an API key.
2. Pick one document and optionally name a focus. Submit only on Make guide.
3. Save the generated guide as unread with its source path, model and date.
4. Read it in three short sections, inspect the original and mark it read.
5. Optionally record an explanation in the learner's own words in the journal.

Before connection, the page explains setup and links to Connections; it never
generates a fake response. Provider errors preserve the focus. The initial
request has a 30-second timeout and no streaming; streaming/cancel and a
same-page document panel remain future improvements. Source content is
untrusted input and cannot grant tool permissions. Mobile uses one full-width
page, with a link back to the selected document. Opening a guide does not
silently mark it read; the status control is reversible.

## Project workflows

Entry: Work → Project workflows, or the sidebar's Workflows link.

1. Choose a project label, one allowed personal source, and optionally an
   existing work item in that project and a learning focus.
2. Start the guide agent. The run is recorded as writing, then ready or failed.
   A failed run keeps its context and can be retried.
3. Open the resulting guide. It starts unread and is marked read only by the
   reader on the guide page.
4. Review and edit the generated documentation draft. Add it to the private
   note linked to that source with an explicit action. This appends to the
   existing note and does not replace the source Markdown.
5. Return to the project group to see the work item, run, guide and note status.

The guide agent is a bounded OpenAI call using the same personal source
allowlist as Make a guide. It is not a repository-writing CLI agent. The
workflow does not auto-update SI Docs or GitHub. Runs surviving an interrupted
server call become retryable failures after two minutes. Projects are currently
labels shared by work items and runs; a stable project registry is a later step.

Repository agent orchestration needs a separate runner with an allowlisted
repository, a reserved branch/worktree per writing agent, job heartbeat,
artifact links, diff review and source-specific documentation rules. The app
may request and display those jobs later, but should not launch a shell command
inside an HTTP request or assume the NUC has the workstation's CLI credentials.

## Connections and access

Entry: secondary navigation or an unavailable capability.

List local sources and the planned integrations with explicit status. Describe
what connection enables, what data it reads and what setup is still needed.
Never use a green “connected” indicator based solely on a configured URL.
Remote access is through the private tailnet; show connection failure and retry
without asserting offline writes are synchronized.

## End-of-day review (later)

Today → review day → inspect source-backed changes → record learning and next
action → save through the owning documentation workflow. The worklog draft
distinguishes facts, agent proposals and personal reflections. No automatic
external publishing. The next Today view resumes from the saved result.
