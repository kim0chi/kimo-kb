import { listWorkItems } from '../utils/work-items'

export default defineEventHandler(() => ({ items: listWorkItems() }))
