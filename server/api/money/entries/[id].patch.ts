import { saveMoneyEntry } from '../../../utils/money'

export default defineEventHandler(async (event) => saveMoneyEntry(await readBody(event), getRouterParam(event, 'id')))
