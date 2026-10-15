import { useProjects, projectCall } from '../../../../utils/projects'
export default defineEventHandler(event => projectCall(() => useProjects().get(event.context.publisherProject as string, getRouterParam(event, 'id')!)))
