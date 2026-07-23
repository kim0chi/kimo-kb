import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { hashId } from '../../lib/hash'
import { asList, asPaths, type RawRoadmap, type RawTrack, type RawModule, type RawStep } from './roadmap'

// Exercises are open questions you answer in writing, then check against a model
// answer and grade yourself on. Where a flashcard asks "what does this term mean",
// an exercise asks you to explain, draw or predict — so the answer is prose and the
// grading is a judgement about your own explanation.
//
// Two sources, the same split that makes flashcards work:
//
//   1. Authored — <library>/exercises/*.yaml, which is the only way to get a model
//      answer, and works for a read-only corpus we must not edit.
//   2. Derived — every roadmap step already states an objective ("Explain…",
//      "Draw…", "Predict…"), which is already an exercise prompt.
//
// An authored exercise wins over a derived one with the same prompt.

export interface Exercise {
  id: string
  prompt: string
  /** null → no model answer; you check yourself against `refs` instead. */
  answer: string | null
  refs: string[]
  difficulty: string | null
  tags: string[]
  /** Where it came from, shown under the prompt for context. */
  source: string
}

export function exercisesDir(libraryDir: string): string {
  return join(libraryDir, 'exercises')
}

export interface ExerciseLoad {
  exercises: Exercise[]
  /** Authoring mistakes, surfaced in the UI rather than silently dropping questions. */
  errors: string[]
}

/**
 * Read <library>/exercises/*.yaml. Each file declares which notebook it belongs to:
 *
 *   notebook: si
 *   title: Architecture
 *   exercises:
 *     - prompt: Draw the request path through the app's layers.
 *       answer: |
 *         A request enters through…
 *       refs: [/si/si-docs/sections/03-system-architecture]
 *       difficulty: medium
 *       tags: [architecture]
 */
export function loadExerciseFiles(libraryDir: string, nbId: string): ExerciseLoad {
  const dir = exercisesDir(libraryDir)
  const exercises: Exercise[] = []
  const errors: string[] = []
  if (!existsSync(dir)) return { exercises, errors }

  for (const entry of readdirSync(dir).sort()) {
    if (!/\.ya?ml$/i.test(entry)) continue
    let parsed: unknown
    try {
      parsed = parse(readFileSync(join(dir, entry), 'utf8'))
    } catch (e) {
      errors.push(`${entry}: ${(e as Error).message}`)
      continue
    }
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      errors.push(`${entry}: must be a mapping with \`notebook:\` and \`exercises:\`.`)
      continue
    }

    const file = parsed as Record<string, unknown>
    if (file.notebook !== nbId) continue // belongs to a different notebook
    const group =
      typeof file.title === 'string' && file.title.trim()
        ? file.title.trim()
        : entry.replace(/\.ya?ml$/i, '')

    for (const raw of asList<Record<string, unknown>>(file.exercises)) {
      const prompt = typeof raw?.prompt === 'string' ? raw.prompt.trim() : ''
      if (!prompt) {
        errors.push(`${entry}: an exercise has no \`prompt:\` — skipped.`)
        continue
      }
      const answer = typeof raw?.answer === 'string' ? raw.answer.trim() : ''
      exercises.push({
        id: hashId(`${nbId}:exercise`, prompt),
        prompt,
        answer: answer || null,
        refs: asPaths(raw?.refs),
        difficulty: typeof raw?.difficulty === 'string' ? raw.difficulty : null,
        tags: asPaths(raw?.tags),
        source: group,
      })
    }
  }
  return { exercises, errors }
}

/**
 * One exercise per roadmap step that states an objective. There's no model answer —
 * the step's own docs are what you check yourself against — so these are only worth
 * showing once those docs exist; the API drops the rest as still-planned steps.
 */
export function roadmapExercises(roadmap: RawRoadmap | null, nbId: string): Exercise[] {
  if (!roadmap) return []
  const out: Exercise[] = []
  for (const t of asList<RawTrack>(roadmap.tracks)) {
    for (const m of asList<RawModule>(t?.modules)) {
      for (const s of asList<RawStep>(m?.steps)) {
        const prompt = typeof s?.objective === 'string' ? s.objective.trim() : ''
        if (!prompt) continue
        // Only the refs pointing into this notebook — a step can span several.
        const refs = [...asPaths(s?.learn), ...asPaths(s?.apply)].filter((p) => p.startsWith(`/${nbId}/`))
        if (!refs.length) continue
        out.push({
          id: hashId(`${nbId}:exercise`, prompt),
          prompt,
          answer: null,
          refs,
          difficulty: null,
          tags: [],
          source: [t?.title, m?.title].filter(Boolean).join(' · ') || 'Roadmap',
        })
      }
    }
  }
  return out
}

/** First occurrence of an id wins, so pass authored exercises first. */
export function mergeExercises(...groups: Exercise[][]): Exercise[] {
  const seen = new Set<string>()
  const out: Exercise[] = []
  for (const group of groups) {
    for (const e of group) {
      if (seen.has(e.id)) continue
      seen.add(e.id)
      out.push(e)
    }
  }
  return out
}
