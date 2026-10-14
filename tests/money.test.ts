import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { formatSgd, nextMonth, parseAmountCents, validEntryDate, validMonth } from '../lib/money.ts'

test('money input keeps cents exact and rejects fractions beyond cents', () => {
  assert.equal(parseAmountCents('12.25'), 1225)
  assert.equal(parseAmountCents('0.01'), 1)
  assert.equal(parseAmountCents('0'), null)
  assert.equal(parseAmountCents('0', true), 0)
  assert.equal(parseAmountCents('12.345'), null)
  assert.equal(parseAmountCents('-3'), null)
  assert.equal(parseAmountCents('1000000000'), null)
  assert.equal(formatSgd(-1225), '−S$12.25')
})

test('calendar validation covers leap days and year rollover', () => {
  assert.equal(validMonth('2026-13'), false)
  assert.equal(validEntryDate('2026-02-29'), false)
  assert.equal(validEntryDate('2028-02-29'), true)
  assert.equal(nextMonth('2026-12'), '2027-01')
})
