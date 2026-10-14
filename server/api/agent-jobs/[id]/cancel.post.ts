import { cancelAgentJob } from '../../../utils/agent-jobs'

export default defineEventHandler(event => ({
  job: cancelAgentJob(getRouterParam(event, 'id') || ''),
}))
