import { queryCollection } from '@nuxt/content/server'
import { notebookMeta } from '../../lib/notebooks'
import { getNotebooks } from '../utils/library'
import { loadCards } from '../utils/flashcards'
import { cardStates } from '../utils/db'
import { isDue } from '../../lib/srs'

// Lists the notebooks in the library: public metadata + doc count (progress) +
// flashcard due count (review).
export default defineEventHandler(async (event) => {
  const nbs = getNotebooks(event)
  const rows = (await queryCollection(event, 'docs').select('path').all()) as { path?: string }[]
  const states = cardStates()
  const today = new Date().toISOString().slice(0, 10)

  return {
    notebooks: nbs.map((n) => {
      const cards = loadCards(n)
      return {
        ...notebookMeta(n),
        docCount: rows.filter((r) => r.path?.startsWith(`/${n.id}/`)).length,
        cardCount: cards.length,
        due: cards.filter((c) => isDue(states[c.id], today)).length,
      }
    }),
  }
})
