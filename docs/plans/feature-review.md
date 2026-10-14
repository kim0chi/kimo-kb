# Feature review: one reading loop

2026-10-14. Benedict paused NUC deployment and asked to review the features,
simplify the interface, and let AI write readable artifacts with read status.

## Main flow

Library source → Make a guide → Guides (unread) → Open guide → Mark as read →
optionally write your own explanation in the journal.

The guide is a saved AI-written artifact, not a chat message. It keeps its
source path, model and creation date. Opening it does not claim it was read;
the reader marks it read explicitly and can put it back in the queue. Today
shows the next learning step, unread guides and a short work list.

## Review decisions

| Surface | What obscured the task | Change |
| --- | --- | --- |
| Today | Large slogan, metric cards, and repeated links competed with the next step. | Use a short heading, one learning step, unread guides, and a bounded work list. |
| Library | Planned tracks looked like notebooks one could open. | Show only real notebooks; roadmap planning stays in Learn. |
| Work / Ideas / Studio | Eyebrows, decorative symbols, and cross-links repeated navigation. | Keep the title, relevant action, filters and real items. |
| Assistant | One-off answers vanished after leaving the page. | Generate a short guide, save it unread, and open its reading page. |
| Navigation | “Ask a source” described a tool, not a destination. | “Guides” points to the reading queue; source pages offer creation in context. |
| Journal | A poetic heading hid the page's purpose. | Use the direct name “Learning journal.” |

## Data and limits

- `reading_artifacts` is local SQLite state. Source Markdown remains in the
  notebook library. New guide content is saved only after a successful provider
  response. It is never marked read automatically.
- The OpenAI request remains source-scoped. The default allowlist contains only
  the personal CS notebook. SI and externally rooted work documents are blocked.
  A real API key is not in this repository.
- Generated text is displayed as text. The three requested sections make it
  easier to scan, and a source link stays attached for fact checking.
- This pass does not add ticket-specific tutoring, graph/vector search, GitHub
  synchronization or NUC deployment. Those require separate source and access
  decisions; deployment is explicitly on hold.

## Verification

Run the existing test suite and production build. Against an isolated state DB
and mock OpenAI endpoint: create a guide, confirm it starts unread, fetch it by
ID, mark read, mark unread, and reject an SI source. Browser-check Today,
Guides, guide detail and creation at phone and desktop widths, both themes.
