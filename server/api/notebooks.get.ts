import { queryCollection } from '@nuxt/content/server'
import { notebookMeta } from '../../lib/notebooks'
import { getNotebooks } from '../utils/library'
import { loadCards } from '../utils/flashcards'
import { loadExerciseFiles, roadmapExercises, mergeExercises } from '../utils/exercises'
import { loadRoadmap } from '../utils/roadmap'
import { cardStates, exerciseStates } from '../utils/db'
import { isDue } from '../../lib/srs'

// Lists the notebooks in the library: public metadata + doc count (progress) +
// flashcard and exercise due counts.
export default defineEventHandler(async (event) => {
  const { library } = useRuntimeConfig(event)
  const nbs = getNotebooks(event)
  const rows = (await queryCollection(event, 'docs').select('path').all()) as { path?: string }[]
  const paths = new Set(rows.map((r) => r.path).filter(Boolean) as string[])
  const states = cardStates()
  const exStates = exerciseStates()
  const { roadmap } = loadRoadmap(library as string)
  const today = new Date().toISOString().slice(0, 10)

  return {
    notebooks: nbs.map((n) => {
      const cards = loadCards(n)
      // Same rule as /api/exercises: a derived exercise only counts once the docs
      // it points at exist, so the sidebar badge matches what the page will show.
      const exercises = mergeExercises(
        loadExerciseFiles(library as string, n.id).exercises,
        roadmapExercises(roadmap, n.id),
      ).filter((e) => e.answer !== null || e.refs.some((p) => paths.has(p)))
      return {
        ...notebookMeta(n),
        docCount: rows.filter((r) => r.path?.startsWith(`/${n.id}/`)).length,
        cardCount: cards.length,
        due: cards.filter((c) => isDue(states[c.id], today)).length,
        exerciseCount: exercises.length,
        exercisesDue: exercises.filter((e) => isDue(exStates[e.id], today)).length,
      }
    }),
  }
})
