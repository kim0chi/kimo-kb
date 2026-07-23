// Shared, pure roadmap logic — imported by both the server (structure) and the
// /learn page (status). Status is derived from reading state, so it must be
// computable on the client to stay live as you read.

export type StepStatus = 'planned' | 'todo' | 'reading' | 'done'

export interface StepRef {
  path: string
  title: string | null
  exists: boolean
}
export interface RoadmapStep {
  id: string
  title: string
  objective: string | null
  learn: StepRef[]
  apply: StepRef[]
}
export interface RoadmapModule {
  id: string
  title: string
  prereqs: string[]
  steps: RoadmapStep[]
}
export interface RoadmapTrack {
  id: string
  title: string
  description: string | null
  modules: RoadmapModule[]
}

/** The first learn doc that actually exists — where "open this step" should go. */
export function entryPath(step: RoadmapStep): string | null {
  return step.learn.find((r) => r.exists)?.path ?? null
}

/**
 * A step's status comes from the reading state of the docs it references.
 * No resolvable `learn` doc yet → "planned" (content still to be written).
 */
export function stepStatus(step: RoadmapStep, statusOf: (path: string) => string): StepStatus {
  const resolved = step.learn.filter((r) => r.exists)
  if (!resolved.length) return 'planned'
  const s = resolved.map((r) => statusOf(r.path))
  if (s.every((x) => x === 'done')) return 'done'
  if (s.some((x) => x === 'done' || x === 'reading')) return 'reading'
  return 'todo'
}

export interface Counts {
  done: number
  ready: number
  total: number
}
export function countSteps(steps: RoadmapStep[], statusOf: (p: string) => string): Counts {
  const s = steps.map((st) => stepStatus(st, statusOf))
  return {
    done: s.filter((x) => x === 'done').length,
    ready: s.filter((x) => x !== 'planned').length,
    total: s.length,
  }
}

/** A module with no steps is vacuously complete, so it can satisfy a prereq. */
export function isModuleComplete(m: RoadmapModule, statusOf: (p: string) => string): boolean {
  const c = countSteps(m.steps, statusOf)
  return c.total === 0 || c.done === c.total
}

/** Every step across the track, flattened — handy for whole-track counts. */
export function trackSteps(t: RoadmapTrack): RoadmapStep[] {
  return t.modules.flatMap((m) => m.steps)
}

export interface TrackBuild {
  built: number
  total: number
  /** planned = nothing built; partial = some built; complete = all built. */
  state: 'planned' | 'partial' | 'complete'
}

/**
 * How much of a track has real content behind it — a step counts as "built" once it
 * resolves to a doc that exists (independent of reading state, so it's the same
 * before/after login). A complete track is fully carried by its notebook on the
 * shelf; a planned or partial one is a library still being built, which the shelf
 * surfaces as a placeholder so the whole roadmap is visible.
 */
export function trackBuild(t: RoadmapTrack): TrackBuild {
  const steps = trackSteps(t)
  const built = steps.filter((s) => entryPath(s) !== null).length
  const total = steps.length
  const state = total === 0 || built === 0 ? 'planned' : built === total ? 'complete' : 'partial'
  return { built, total, state }
}

export interface NextUp {
  trackId: string
  trackTitle: string
  moduleTitle: string
  step: RoadmapStep
  entry: string | null
}

/**
 * The first actionable step: earliest track/module order, skipping modules whose
 * prereqs aren't met. Prereqs resolve against modules ACROSS the whole roadmap,
 * so a track can depend on another track's module.
 */
export function pickNext(tracks: RoadmapTrack[], statusOf: (p: string) => string): NextUp | null {
  const complete = new Set<string>()
  for (const t of tracks) {
    for (const m of t.modules) if (isModuleComplete(m, statusOf)) complete.add(m.id)
  }
  for (const t of tracks) {
    for (const m of t.modules) {
      if (m.prereqs.length && !m.prereqs.every((p) => complete.has(p))) continue
      for (const step of m.steps) {
        const st = stepStatus(step, statusOf)
        if (st === 'todo' || st === 'reading') {
          return {
            trackId: t.id,
            trackTitle: t.title,
            moduleTitle: m.title,
            step,
            entry: entryPath(step),
          }
        }
      }
    }
  }
  return null
}
