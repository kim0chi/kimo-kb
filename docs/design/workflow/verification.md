# Verification

Status: local implementation verified on 2026-10-14. Benedict explicitly chose
direct implementation, so no Figma approval or node IDs apply.

- Node 22 `npm test`: 23 passed. Production `npm run build`: passed.
- Isolated SQLite API checks: task create/edit/promote, journal entry, graded
  attempt history, invalid URL handling and backup/restore integrity passed.
- OpenAI mock-provider check: three CS sources listed; selected CS request
  returned an answer; SI, manifesto and path traversal requests returned 403;
  outgoing body contained only selected CS text and `store: false`.
- Without an API key, status is unconfigured and a source request returns 503.
- Playwright Chromium at 390px and 1440px: Today and dashboard routes rendered
  without page errors or horizontal overflow. Ask rendered and submitted a mock
  question; mobile work sheet fills the viewport. Light/dark Today and Work
  screenshots were inspected during implementation.
- Remaining: NUC deployment, real OpenAI call (no key provisioned), and 15 npm
  audit findings (12 high, 3 low). Non-breaking `npm audit fix` reduced the
  findings from 35; remaining suggested fixes include breaking package changes
  and require targeted dependency updates.

2026-10-14 feature simplification and saved guides:

- Source-scoped mock OpenAI request created an unread guide in an isolated
  SQLite database. Detail fetch, read → unread toggle, 400 invalid state,
  404 missing ID and 403 SI source checks passed. The outbound request still
  carried only CS source text with `store: false`.
- Chromium checked Today, Guides, guide detail, creation, Library and Work at
  320, 375, 414, 768 and 1440px. The 375px pass included both light and dark.
  No page errors or horizontal overflow occurred. The UI read control and
  Guides grouping updated after a toggle.
- The Impeccable mechanical detector found one width transition in the
  existing Library progress bar; it was removed. A final build and smoke check
  followed this correction.
- Benedict put NUC deployment on hold. A real OpenAI call still needs a
  server-side API key.

2026-10-14 money tracker:

- Node 22 `npm test`: 25 passed, including cents/date edge cases. Production
  build passed. The project has no `vue-tsc` installed, so `nuxi typecheck`
  cannot run separately; the Nuxt build completed.
- Isolated SQLite API checks passed for invalid month/amount/date, limit set
  and clear, income and expense totals, month isolation, edit and delete.
- Chromium checked Money at 320, 375, 414, 768 and 1440px: no page errors or
  horizontal overflow. Mobile menu access, budget save, entry add/edit,
  cancel removal and dark theme worked. Light and dark screenshots were
  inspected. The test database is under `/tmp`, not the personal state DB.
- Impeccable detector reported no findings for the changed UI files. NUC
  deployment remains paused.

2026-10-14 review fixes:

- Node 22 `npm test`: 27 passed. Production build passed without a password in
  the build environment. Nuxt Content's document SQL dump is no longer
  prerendered into `.output/public`; its authenticated dynamic route returned
  401 without credentials and 200 with credentials. Money page/API behaved the
  same. Without a production password, all three returned 503.
- A new isolated DB and an existing `0644` scratch DB both ended with `0600`
  permissions for DB, WAL and SHM after opening. Windows NTFS ACLs still need
  separate verification before any NUC deployment.
- Playwright with HTTP Basic credentials loaded Money and Library without page
  errors. At 320px, a maximum allowed amount left both entry action buttons
  inside the viewport. A delayed October save followed by a September draft
  preserved the September amount and category. The updated screen was visually
  inspected; Impeccable reported no mechanical findings.
- Static app assets remain public to anyone who can reach the listener, so the
  private tailnet binding and ACL remain necessary. No NUC connection or
  deployment was made in this pass.
- Nuxt dev with the same password returned 401 without credentials and 200
  with credentials for Money, its API and the content dump. Its SQLite files
  were `0600`; owner-only pre-creation avoids `process.umask()` because Nuxt
  dev workers reject that call. There is no loopback password exception.
