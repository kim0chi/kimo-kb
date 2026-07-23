import { queryCollection } from '@nuxt/content/server'
import { loadExerciseFiles, roadmapExercises, mergeExercises } from '../utils/exercises'
import { loadRoadmap } from '../utils/roadmap'
import { exerciseStates } from '../utils/db'
import { getNotebooks } from '../utils/library'
import { notebookById } from '../../lib/notebooks'
import { isDue } from '../../lib/srs'

// A notebook's exercise bank: authored YAML first, then anything derivable from the
// roadmap's objectives, with each reference resolved to a real doc.
export default defineEventHandler(async (event) => {
  const { library } = useRuntimeConfig(event)
  const nb = notebookById(getNotebooks(event), (getQuery(event).notebook as string) || null)
  if (!nb) return { exercises: [], states: {}, due: 0, errors: [] }

  const { roadmap } = loadRoadmap(library as string)
  const { exercises: authored, errors } = loadExerciseFiles(library as string, nb.id)
  const all = mergeExercises(authored, roadmapExercises(roadmap, nb.id))

  const rows = (await queryCollection(event, 'docs').select('path', 'title').all()) as {
    path?: string
    title?: string | null
  }[]
  const titleByPath = new Map(rows.filter((r) => r.path).map((r) => [r.path!, r.title || r.path!]))

  const exercises = all
    .map((e) => ({
      ...e,
      refs: e.refs.map((path) => ({
        path,
        title: titleByPath.get(path) ?? null,
        exists: titleByPath.has(path),
      })),
    }))
    // A derived exercise with nothing to check against is a step whose docs aren't
    // written yet. Authored ones carry their own answer, so they always stand.
    .filter((e) => e.answer !== null || e.refs.some((r) => r.exists))

  const states = exerciseStates()
  const today = new Date().toISOString().slice(0, 10)
  return {
    exercises,
    states,
    due: exercises.filter((e) => isDue(states[e.id], today)).length,
    errors,
  }
})
