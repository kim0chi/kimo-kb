import { useProjects, projectCall } from '../../../../../utils/projects'
export default defineEventHandler(async event => {
 const input = await readBody(event)
 return projectCall(() => useProjects().markRead(getRouterParam(event, 'project')!, getRouterParam(event, 'id')!, input?.revision, input?.read))
})
