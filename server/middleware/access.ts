import { accessDecision } from '../utils/access'
import { runnerAccessDecision } from '../utils/runner-access'

export default defineEventHandler((event) => {
  // Nuxt Content builds its static SQL dump through the prerender server.
  // This is a compile-time Nitro flag, not a client-supplied header.
  if (import.meta.prerender) return
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
