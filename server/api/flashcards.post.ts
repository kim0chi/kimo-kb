import { gradeCard } from '../utils/db'

// Grade a card (0 Again, 1 Hard, 2 Good, 3 Easy) → returns its new schedule.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: string; grade?: number }>(event)
  const id = typeof body?.id === 'string' ? body.id : ''
  const grade = Number(body?.grade)
  if (!id || !Number.isInteger(grade) || grade < 0 || grade > 3) {
    throw createError({ statusCode: 400, statusMessage: 'id and grade (0–3) are required.' })
  }
  return { id, sched: gradeCard(id, grade, new Date()) }
})
