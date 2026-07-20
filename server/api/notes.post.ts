import { setNote } from '../utils/db'

// Saves (or clears, if body is empty) the note for one doc.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ path?: string; body?: string }>(event)

  const path = typeof body?.path === 'string' ? body.path.trim() : ''
  if (!path || !path.startsWith('/')) {
    throw createError({ statusCode: 400, statusMessage: 'A valid doc path is required.' })
  }

  const text = typeof body?.body === 'string' ? body.body : ''
  const updatedAt = new Date().toISOString()
  setNote(path, text, updatedAt)

  return { path, saved: true, hasNote: !!text.trim(), updatedAt }
})
