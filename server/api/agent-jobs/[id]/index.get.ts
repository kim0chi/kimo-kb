import { getAgentJob } from '../../../utils/agent-jobs'

export default defineEventHandler(event => {
  const job = getAgentJob(getRouterParam(event, 'id') || '')
  if (!job) throw createError({ statusCode: 404, statusMessage: 'Agent job not found.' })
  return { job }
})
