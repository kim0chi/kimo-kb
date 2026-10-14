import { timingSafeEqual } from 'node:crypto'

export type AccessDecision = 'authorized' | 'unconfigured' | 'unauthorized'

export function accessDecision(
  authorization: string | undefined,
  password: string | undefined,
): AccessDecision {
  // Require the same credential locally and remotely. Proxies can make a
  // remote request look like loopback, and Nuxt dev omits the socket address.
  if (!password || password.length < 16) return 'unconfigured'
  const match = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(authorization || '')
  if (!match) return 'unauthorized'
  const supplied = Buffer.from(match[1], 'base64')
  const expected = Buffer.from(`kimo:${password}`, 'utf8')
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
    ? 'authorized' : 'unauthorized'
}
