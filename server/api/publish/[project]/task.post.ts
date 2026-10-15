import { saveProjectTask } from '../../../utils/projects'
export default defineEventHandler(async event => saveProjectTask(event.context.publisherProject as string, await readBody(event)))
