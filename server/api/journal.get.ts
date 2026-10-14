import { useDb } from '../utils/db'

export default defineEventHandler(() => {
  const d = useDb()
  return {
    entries: d.prepare(
      'SELECT id, concept, understanding, question, source_url AS sourceUrl, created_at AS createdAt FROM learning_entries ORDER BY created_at DESC LIMIT 100',
    ).all(),
    attempts: d.prepare(
      'SELECT id, exercise_id AS exerciseId, grade, attempt, created_at AS createdAt FROM exercise_attempts ORDER BY created_at DESC, id DESC LIMIT 100',
    ).all(),
  }
})
