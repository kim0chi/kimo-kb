import { timingSafeEqual } from 'node:crypto'

export function publisherAccess(header: string | undefined, project: string, config: string | undefined): boolean {
  if (!/^[a-z0-9-]+$/.test(project)) return false
  try {
    const tokens = JSON.parse(config || '{}')
    const token = Object.hasOwn(tokens, project) ? tokens[project] : undefined
    const supplied = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(header || '')?.[1]
    if (typeof token !== 'string' || token.length < 32 || !supplied) return false
    const a = Buffer.from(token), b = Buffer.from(supplied)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch { return false }
}
