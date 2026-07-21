import { getNotebooks } from '../utils/library'

// Redirect pre-notebook URLs (from before Phases 15/16) to the current structure,
// so stale bookmarks / open tabs don't 404.
const TREE_RULES: [RegExp, string][] = [
  [/^\/si_docs\//, '/si/si-docs/'],
  [/^\/notes\//, '/si/notes/'],
  [/^\/decisions\//, '/si/decisions/'],
]

export default defineEventHandler((event) => {
  const path = event.path
  for (const [re, repl] of TREE_RULES) {
    if (re.test(path)) return sendRedirect(event, path.replace(re, repl), 302)
  }
  // The old global glossary now lives per-notebook.
  if (path === '/glossary' || path.startsWith('/glossary?')) {
    const first = getNotebooks(event)[0]
    if (first) return sendRedirect(event, `/${first.id}/glossary`, 302)
  }
})
