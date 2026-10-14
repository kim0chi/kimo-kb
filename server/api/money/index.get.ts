import { readMoneyMonth } from '../../utils/money'

export default defineEventHandler((event) => {
  const { month } = getQuery(event)
  return readMoneyMonth(typeof month === 'string' ? month : '')
})
