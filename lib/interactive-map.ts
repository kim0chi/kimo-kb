// Sidecar map: doc content-path -> interactive explainer component names.
//
// This lives in the KB app, NOT in the corpus, so the markdown stays byte-for-byte
// untouched and Obsidian renders it cleanly. Phase 4 renders these components
// alongside the doc body. (Opt-in frontmatter in the corpus can be added later if
// ever wanted, but the sidecar is the default.)
//
// Component names map to Vue components under app/components/interactive/.
export const interactiveMap: Record<string, string[]> = {
  // '/si-docs/sections/09-http-auth': ['request-lifecycle-diagram'],
  // '/si-docs/sections/10-jobs-queues': ['queue-pipeline'],
  // '/si-docs/sections/06-data-model': ['data-model-explorer'],
}

export function interactiveFor(path: string): string[] {
  return interactiveMap[path] ?? []
}
