import { gradeExercise } from '../utils/db'

// Grade an exercise (0 Missed it … 3 Nailed it) and store the answer that was
// written → returns its new schedule.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: string; grade?: number; attempt?: string }>(event)
  const id = typeof body?.id === 'string' ? body.id : ''
  const grade = Number(body?.grade)
  if (!id || !Number.isInteger(grade) || grade < 0 || grade > 3) {
    throw createError({ statusCode: 400, statusMessage: 'id and grade (0–3) are required.' })
  }
  const attempt = typeof body?.attempt === 'string' ? body.attempt : ''
  return { id, sched: gradeExercise(id, grade, attempt, new Date()) }
})
