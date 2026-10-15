import { useProjects } from '../../utils/projects'
export default defineEventHandler(() => ({ projects: useProjects().projects() }))
