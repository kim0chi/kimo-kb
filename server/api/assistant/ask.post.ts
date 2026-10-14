import { writeGuide } from '../../utils/guide-agent'

export default defineEventHandler(async event => {
  const body = await readBody(event)
  const path = typeof body?.path === 'string' ? body.path : ''
  const focus = typeof body?.question === 'string' ? body.question.trim() : ''
  return writeGuide(event, path, focus)
})
