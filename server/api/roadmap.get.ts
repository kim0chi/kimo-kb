import { queryCollection } from '@nuxt/content/server'
import { loadRoadmap, stepStatus } from '../utils/roadmap'
import { allStates } from '../utils/db'

// The learning path: the roadmap manifest resolved against the notebooks, with
// per-step status derived from reading state. Steps whose docs don't exist yet
// come back as "planned" (the content backlog).
export default defineEventHandler(async (event) => {
  const { library } = useRuntimeConfig(event)
  const roadmap = loadRoadmap(library as string)
  if (!roadmap) return { roadmap: null, tracks: [] }

  const rows = (await queryCollection(event, 'docs').select('path', 'title').all()) as {
    path?: string
    title?: string | null
  }[]
  const titleByPath = new Map(rows.filter((r) => r.path).map((r) => [r.path!, r.title || r.path!]))
  const known = new Set(titleByPath.keys())
  const states = allStates() as Record<string, string>

  const ref = (p: string) => ({ path: p, title: titleByPath.get(p) ?? null, exists: known.has(p) })

  const tracks = (roadmap.tracks ?? []).map((t) => {
    const modules = (t.modules ?? []).map((m) => {
      const steps = (m.steps ?? []).map((s) => {
        const learn = (s.learn ?? []).map(ref)
        return {
          id: s.id,
          title: s.title,
          objective: s.objective ?? null,
          learn,
          apply: (s.apply ?? []).map(ref),
          status: stepStatus(s.learn ?? [], known, states),
        }
      })
      const done = steps.filter((s) => s.status === 'done').length
      const ready = steps.filter((s) => s.status !== 'planned').length
      return { id: m.id, title: m.title, prereqs: m.prereqs ?? [], steps, done, ready, total: steps.length }
    })
    const all = modules.flatMap((m) => m.steps)
    return {
      id: t.id,
      title: t.title,
      description: t.description ?? null,
      modules,
      done: all.filter((s) => s.status === 'done').length,
      ready: all.filter((s) => s.status !== 'planned').length,
      total: all.length,
    }
  })

  // "Up next": the first non-done step that has content, honouring module prereqs.
  let next: { track: string; trackTitle: string; module: string; step: unknown } | null = null
  outer: for (const t of tracks) {
    const doneModules = new Set(t.modules.filter((m) => m.total && m.done === m.total).map((m) => m.id))
    for (const m of t.modules) {
      if (m.prereqs.length && !m.prereqs.every((p) => doneModules.has(p))) continue
      for (const s of m.steps) {
        if (s.status === 'todo' || s.status === 'reading') {
          next = { track: t.id, trackTitle: t.title, module: m.title, step: s }
          break outer
        }
      }
    }
  }

  return { roadmap: { title: roadmap.title ?? 'Roadmap', description: roadmap.description ?? null }, tracks, next }
})
