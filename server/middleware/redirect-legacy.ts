// Redirect pre-notebook URLs (from before Phase 15) to the namespaced ones, so
// stale bookmarks / open tabs (e.g. /si_docs/done-reading/beginners-guide) don't
// fatally 404. Only the three old top-level prefixes are rewritten.
const RULES: [RegExp, string][] = [
  [/^\/si_docs\//, '/si/si-docs/'],
  [/^\/notes\//, '/si/notes/'],
  [/^\/decisions\//, '/si/decisions/'],
]

export default defineEventHandler((event) => {
  const path = event.path
  for (const [re, repl] of RULES) {
    if (re.test(path)) return sendRedirect(event, path.replace(re, repl), 302)
  }
})
