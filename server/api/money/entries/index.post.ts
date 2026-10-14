import { saveMoneyEntry } from '../../../utils/money'

export default defineEventHandler(async (event) => {
  const entry = saveMoneyEntry(await readBody(event))
  setResponseStatus(event, 201)
  return entry
})
