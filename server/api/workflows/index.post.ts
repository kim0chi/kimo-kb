import { allowedSources } from '../../utils/assistant'
import { writeGuide } from '../../utils/guide-agent'
import { createWorkflowRun, failWorkflowRun, finishWorkflowRun } from '../../utils/workflows'

export default defineEventHandler(async event => {
  const body = await readBody(event)
  const path = typeof body?.sourcePath === 'string' ? body.sourcePath : ''
  const source = (await allowedSources(event)).find(item => item.path === path)
  if (!source) throw createError({ statusCode: 403, statusMessage: 'Choose a personal source allowed for AI.' })
  if (!process.env.OPENAI_API_KEY) {
    throw createError({ statusCode: 503, statusMessage: 'Connect OpenAI before starting a guide run.' })
  }
  const focus = typeof body?.focus === 'string' ? body.focus.trim() : ''
  const run = createWorkflowRun({
    project: typeof body?.project === 'string' ? body.project : '',
    workItemId: typeof body?.workItemId === 'string' && body.workItemId ? body.workItemId : null,
    sourcePath: source.path, sourceTitle: source.title, focus,
  })
  try {
    const result = await writeGuide(event, source.path, focus)
    return { run: finishWorkflowRun(run.id, result.artifact.id, result.answer) }
  } catch (cause) {
    const failure = cause as { statusMessage?: string }
    return { run: failWorkflowRun(run.id, failure.statusMessage || 'The guide agent failed. Retry this run.') }
  }
})
