import { saveWorkItem } from '../utils/work-items'

export default defineEventHandler(async (event) => {
  setResponseStatus(event, 201)
  return saveWorkItem(await readBody(event))
})
