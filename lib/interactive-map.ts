// Sidecar map: doc content-path -> interactive explainer ids.
//
// This lives in the KB app, NOT in the corpus, so the markdown stays byte-for-byte
// untouched and Obsidian renders it cleanly. Ids resolve to Vue components in
// app/components/interactive/registry.ts. Each explainer is bespoke — we map only
// the high-value docs, not all 122.
// Keys are namespaced content paths (per notebook): /<notebook>/<tree>/<...>.
export const interactiveMap: Record<string, string[]> = {
  '/si/si-docs/sections/09-http-auth': ['request-lifecycle'],
  '/si/si-docs/sections/10-jobs-queues': ['queue-pipeline'],
  '/si/si-docs/sections/06-data-model': ['data-model'],
}

export function interactiveFor(path: string): string[] {
  return interactiveMap[path] ?? []
}
