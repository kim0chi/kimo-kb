import { accessDecision } from '../utils/access'
import { runnerAccessDecision } from '../utils/runner-access'
import { publisherAccess } from '../utils/publisher-access'

export default defineEventHandler((event) => {
  // Nuxt Content builds its static SQL dump through the prerender server.
  // This is a compile-time Nitro flag, not a client-supplied header.
  if (import.meta.prerender) return
  const path = getRequestURL(event).pathname
  if (path.startsWith('/api/publish/')) {
    const project = path.split('/')[3]
    if (!publisherAccess(getRequestHeader(event, 'authorization'), project, process.env.KB_PUBLISHER_TOKENS)) {
      throw createError({ statusCode: 401, statusMessage: 'Project publisher token required.' })
    }
    event.context.publisherProject = project
    return
  }
  if (getRequestURL(event).pathname.startsWith('/api/runner/')) {
    const runner = runnerAccessDecision(getRequestHeader(event, 'authorization'), process.env.KB_RUNNER_TOKEN)
    if (runner === 'authorized') return
    throw createError({
      statusCode: runner === 'unconfigured' ? 503 : 401,
      statusMessage: runner === 'unconfigured' ? 'Runner access is not configured.' : 'Runner token required.',
    })
  }
  const decision = accessDecision(
    getRequestHeader(event, 'authorization'),
    process.env.KB_ACCESS_PASSWORD,
  )
  if (decision === 'authorized') return
  if (decision === 'unconfigured') {
    throw createError({ statusCode: 503, statusMessage: 'Kimo requires KB_ACCESS_PASSWORD (at least 16 characters)' })
  }
  setResponseHeader(event, 'WWW-Authenticate', 'Basic realm="Kimo", charset="UTF-8"')
  throw createError({ statusCode: 401, statusMessage: 'Sign in to Kimo' })
})
