import { accessDecision } from '../utils/access'

export default defineEventHandler((event) => {
  // Nuxt Content builds its static SQL dump through the prerender server.
  // This is a compile-time Nitro flag, not a client-supplied header.
  if (import.meta.prerender) return
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
