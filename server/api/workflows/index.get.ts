import { listWorkflowRuns } from '../../utils/workflows'
import { listWorkItems } from '../../utils/work-items'

export default defineEventHandler(() => ({
  runs: listWorkflowRuns(),
  workItems: listWorkItems(),
}))
