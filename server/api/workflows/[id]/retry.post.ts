import { allowedSources } from '../../../utils/assistant'
import { writeGuide } from '../../../utils/guide-agent'
import { getWorkflowRun, retryWorkflowRun, failWorkflowRun, finishWorkflowRun } from '../../../utils/workflows'

export default defineEventHandler(async event => {
  const id = getRouterParam(event, 'id') || ''
  const prior = getWorkflowRun(id)
  if (!prior) throw createError({ statusCode: 404, statusMessage: 'Workflow not found.' })
  if (!(await allowedSources(event)).some(item => item.path === prior.sourcePath)) {
    throw createError({ statusCode: 403, statusMessage: 'This source is no longer allowed for AI.' })
  }
  if (!process.env.OPENAI_API_KEY) throw createError({ statusCode: 503, statusMessage: 'Connect OpenAI before retrying.' })
  retryWorkflowRun(id)
  try {
    const result = await writeGuide(event, prior.sourcePath, prior.focus)
    return { run: finishWorkflowRun(id, result.artifact.id, result.answer) }
  } catch (cause) {
    const failure = cause as { statusMessage?: string }
    return { run: failWorkflowRun(id, failure.statusMessage || 'The guide agent failed. Retry this run.') }
  }
})
