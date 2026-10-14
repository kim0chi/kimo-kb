import { timingSafeEqual } from 'node:crypto'

export function runnerAccessDecision(header: string | undefined, token: string | undefined):
  'authorized' | 'unconfigured' | 'unauthorized' {
  if (!token || token.length < 32) return 'unconfigured'
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(header || '')
  if (!match) return 'unauthorized'
  const supplied = Buffer.from(match[1], 'utf8')
  const expected = Buffer.from(token, 'utf8')
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
    ? 'authorized' : 'unauthorized'
}
