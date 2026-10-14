import { claimAgentJob } from '../../utils/agent-jobs'

export default defineEventHandler(async event => {
  const body = await readBody(event)
  return { job: claimAgentJob(body?.runnerId) }
})
