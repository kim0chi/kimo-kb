import { useProjects, projectCall } from '../../../../utils/projects'
export default defineEventHandler(event => projectCall(() => {
 const store = useProjects(), project = getRouterParam(event, 'project')!, id = getRouterParam(event, 'id')!
 const revision = getQuery(event).revision
 return revision ? store.revision(project,id,Number(revision)) : { ...store.get(project,id), history: store.history(project,id) }
}))
