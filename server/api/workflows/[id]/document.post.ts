import { allowedSources } from '../../../utils/assistant'
import { applyWorkflowNote, getWorkflowRun } from '../../../utils/workflows'

export default defineEventHandler(async event => {
  const id = getRouterParam(event, 'id') || ''
  const run = getWorkflowRun(id)
  if (!run) throw createError({ statusCode: 404, statusMessage: 'Workflow not found.' })
  if (!(await allowedSources(event)).some(item => item.path === run.sourcePath)) {
    throw createError({ statusCode: 403, statusMessage: 'This source is no longer in the personal notebook.' })
  }
  const body = await readBody(event)
  return { run: applyWorkflowNote(id, typeof body?.noteDraft === 'string' ? body.noteDraft : '') }
})
