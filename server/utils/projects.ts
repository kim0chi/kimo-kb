import { projectStore, ProjectError } from '../../lib/projects'
import { useDb } from './db'
import { listWorkItems, saveWorkItem } from './work-items'

export const useProjects = () => projectStore(useDb())
export function projectCall<T>(fn: () => T): T {
  try { return fn() } catch (error) {
    if (error instanceof ProjectError) throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    throw error
  }
}
export function projectWorkspace(id: string) {
  return projectCall(() => {
    const store = useProjects()
    const project = store.project(id)
    const tasks = listWorkItems().filter(item => item.project.toLowerCase() === project.name.toLowerCase() && item.kind === 'task')
    const artifacts = store.list(id).map(({ content, ...item }) => ({ ...item, preview: content.slice(0, 180) }))
    return { project, tasks, artifacts }
  })
}
export function saveProjectTask(projectId: string, value: unknown) {
  return projectCall(() => useDb().transaction(() => {
    const project = useProjects().project(projectId)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProjectError(400, 'Expected a task')
    const input = value as Record<string, unknown>
    const id = typeof input.id === 'string' ? input.id : undefined
    if (id) {
      const previous = listWorkItems().find(item => item.id === id && item.project.toLowerCase() === project.name.toLowerCase() && item.kind === 'task')
      if (!previous) throw new ProjectError(404, 'Task not found in this project')
      if (input.expectedUpdatedAt !== previous.updatedAt) throw new ProjectError(409, 'Task changed. Refresh before updating.')
    }
    return saveWorkItem({ ...input, project: project.name, kind: 'task' }, id)
  })())
}
