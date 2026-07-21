import { loadCards } from '../utils/flashcards'
import { cardStates } from '../utils/db'
import { getNotebooks } from '../utils/library'
import { notebookById } from '../../lib/notebooks'
import { isDue } from '../../lib/srs'

// A notebook's flashcard deck + review schedules + how many are due today.
export default defineEventHandler((event) => {
  const nb = notebookById(getNotebooks(event), (getQuery(event).notebook as string) || null)
  if (!nb) return { cards: [], states: {}, due: 0 }

  const cards = loadCards(nb)
  const states = cardStates()
  const today = new Date().toISOString().slice(0, 10)
  const due = cards.filter((c) => isDue(states[c.id], today)).length
  return { cards, states, due }
})
