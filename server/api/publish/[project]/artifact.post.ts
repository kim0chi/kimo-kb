import { useProjects, projectCall } from '../../../utils/projects'
export default defineEventHandler(async event => {
 const input = await readBody(event)
 return projectCall(() => useProjects().publish(event.context.publisherProject as string, input, 'VS Code agent'))
})
