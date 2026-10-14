import { saveMoneyBudget } from '../../utils/money'

export default defineEventHandler(async (event) => saveMoneyBudget(await readBody(event)))
