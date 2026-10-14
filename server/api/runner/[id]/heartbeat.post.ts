import { heartbeatAgentJob } from '../../../utils/agent-jobs'

export default defineEventHandler(async event => {
  const body = await readBody(event)
  return heartbeatAgentJob(body?.runnerId, getRouterParam(event, 'id') || '')
})
