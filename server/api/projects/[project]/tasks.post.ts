import { saveProjectTask } from '../../../utils/projects'
export default defineEventHandler(async event => saveProjectTask(getRouterParam(event, 'project')!, await readBody(event)))
