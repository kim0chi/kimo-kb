import { projectWorkspace } from '../../../utils/projects'
export default defineEventHandler(event => projectWorkspace(getRouterParam(event, 'project')!))
