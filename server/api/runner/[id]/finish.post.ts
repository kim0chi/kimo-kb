import { finishAgentJob } from '../../../utils/agent-jobs'

export default defineEventHandler(async event => {
  const body = await readBody(event)
  return {
    job: finishAgentJob(body?.runnerId, getRouterParam(event, 'id') || '', body),
  }
})
