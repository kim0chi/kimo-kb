import { setState, STATUSES, type Status } from '../utils/db'

// Sets the reading status for a single doc. Body: { path: string, status: Status }.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ path?: string; status?: string }>(event)

  const path = typeof body?.path === 'string' ? body.path.trim() : ''
  const status = body?.status as Status

  if (!path || !path.startsWith('/')) {
    throw createError({ statusCode: 400, statusMessage: 'A valid doc path is required.' })
  }
  if (!STATUSES.includes(status)) {
    throw createError({
      statusCode: 400,
      statusMessage: `status must be one of: ${STATUSES.join(', ')}`,
    })
  }

  setState(path, status, new Date().toISOString())
  return { path, status }
})
