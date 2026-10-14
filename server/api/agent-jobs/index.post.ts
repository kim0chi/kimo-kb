import { queueAgentJob } from '../../utils/agent-jobs'

export default defineEventHandler(async event => {
  setResponseStatus(event, 201)
  return { job: queueAgentJob(await readBody(event)) }
})
