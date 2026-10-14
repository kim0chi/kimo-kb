import { setAgentJobRead } from '../../../utils/agent-jobs'

export default defineEventHandler(async event => {
  const body = await readBody(event)
  if (typeof body?.read !== 'boolean') throw createError({ statusCode: 400, statusMessage: 'Choose read or unread.' })
  return { job: setAgentJobRead(getRouterParam(event, 'id') || '', body.read) }
})
