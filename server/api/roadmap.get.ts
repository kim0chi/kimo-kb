import { queryCollection } from '@nuxt/content/server'
import { loadRoadmap, asList, asPaths, type RawTrack, type RawModule, type RawStep } from '../utils/roadmap'
import type { RoadmapTrack, StepRef } from '../../lib/roadmap'

// The learning path: the roadmap manifest resolved against the notebooks.
// Only *structure* is returned — each step's status is derived on the client from
// live reading state (lib/roadmap.ts), so /learn updates as you read.
export default defineEventHandler(async (event) => {
  const { library } = useRuntimeConfig(event)
  const { roadmap, exists, error } = loadRoadmap(library as string)
  if (!roadmap) return { roadmap: null, tracks: [], exists, error, warnings: [] }

  const rows = (await queryCollection(event, 'docs').select('path', 'title').all()) as {
    path?: string
    title?: string | null
  }[]
  const titleByPath = new Map(rows.filter((r) => r.path).map((r) => [r.path!, r.title || r.path!]))

  const ref = (p: string): StepRef => ({
    path: p,
    title: titleByPath.get(p) ?? null,
    exists: titleByPath.has(p),
  })

  const tracks: RoadmapTrack[] = asList<RawTrack>(roadmap.tracks).map((t, ti) => ({
    id: String(t?.id ?? `track-${ti}`),
    title: String(t?.title ?? t?.id ?? `Track ${ti + 1}`),
    description: t?.description ?? null,
    modules: asList<RawModule>(t?.modules).map((m, mi) => ({
      id: String(m?.id ?? `${t?.id ?? ti}-module-${mi}`),
      title: String(m?.title ?? m?.id ?? `Module ${mi + 1}`),
      prereqs: asPaths(m?.prereqs),
      steps: asList<RawStep>(m?.steps).map((s, si) => ({
        id: String(s?.id ?? `${m?.id ?? mi}-step-${si}`),
        title: String(s?.title ?? s?.id ?? `Step ${si + 1}`),
        objective: s?.objective ?? null,
        learn: asPaths(s?.learn).map(ref),
        apply: asPaths(s?.apply).map(ref),
      })),
    })),
  }))

  // Authoring warnings — surfaced in the UI so a typo doesn't silently stall the path.
  const moduleIds = new Set(tracks.flatMap((t) => t.modules.map((m) => m.id)))
  const warnings: string[] = []
  for (const t of tracks) {
    for (const m of t.modules) {
      for (const p of m.prereqs) {
        if (!moduleIds.has(p)) {
          warnings.push(`Module "${t.title} › ${m.title}" requires unknown prereq "${p}" — it will never unlock.`)
        }
      }
    }
  }

  return {
    roadmap: { title: roadmap.title ?? 'Roadmap', description: roadmap.description ?? null },
    tracks,
    exists,
    error,
    warnings,
  }
})
