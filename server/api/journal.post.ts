import { randomUUID } from 'node:crypto'
import { useDb } from '../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createError({ statusCode: 400, statusMessage: 'Expected a learning entry' })
  }
  const fields = [
    ['concept', 200], ['understanding', 10000], ['question', 3000], ['sourceUrl', 2000],
  ] as const
  for (const [name, limit] of fields) {
    if (typeof body[name] !== 'string' || body[name].length > limit) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid ' + name })
    }
  }
  const concept = body.concept.trim()
  const understanding = body.understanding.trim()
  const question = body.question.trim()
  const sourceUrl = body.sourceUrl.trim()
  if (!concept || !understanding) {
    throw createError({ statusCode: 400, statusMessage: 'Concept and explanation are required' })
  }
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol')
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'Source link must be an HTTP or HTTPS URL' })
    }
  }
  const entry = { id: randomUUID(), concept, understanding, question, sourceUrl, createdAt: new Date().toISOString() }
  useDb().prepare(
    'INSERT INTO learning_entries (id, concept, understanding, question, source_url, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(entry.id, entry.concept, entry.understanding, entry.question, entry.sourceUrl, entry.createdAt)
  setResponseStatus(event, 201)
  return entry
})
