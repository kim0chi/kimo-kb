import { useDb } from '../utils/db'

export default defineEventHandler((event) => {
  const id = getQuery(event).exerciseId
  if (typeof id !== 'string' || !id || id.length > 200) {
    throw createError({ statusCode: 400, statusMessage: 'exerciseId is required' })
  }
  const attempts = useDb().prepare(
    'SELECT id, exercise_id AS exerciseId, grade, attempt, created_at AS createdAt FROM exercise_attempts WHERE exercise_id = ? ORDER BY created_at DESC, id DESC LIMIT 50',
  ).all(id)
  return { attempts }
})
