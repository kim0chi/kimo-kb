import { listAgentJobs, listRunners } from '../../utils/agent-jobs'

export default defineEventHandler(() => ({
  jobs: listAgentJobs(),
  runners: listRunners(),
}))
