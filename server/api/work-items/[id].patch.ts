import { saveWorkItem } from '../../utils/work-items'

export default defineEventHandler(async (event) => saveWorkItem(await readBody(event), getRouterParam(event, 'id')))
