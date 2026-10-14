import { deleteMoneyEntry } from '../../../utils/money'

export default defineEventHandler((event) => {
  deleteMoneyEntry(getRouterParam(event, 'id') || '')
  setResponseStatus(event, 204)
})
