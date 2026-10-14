import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { accessDecision } from '../server/utils/access.ts'

test('all requests need a configured password', () => {
  assert.equal(accessDecision(undefined, undefined), 'unconfigured')
  assert.equal(accessDecision(undefined, 'short'), 'unconfigured')
})

test('remote requests require a configured password and exact Basic credentials', () => {
  const secret = 'a-long-private-secret'
  const header = 'Basic ' + Buffer.from(`kimo:${secret}`).toString('base64')
  assert.equal(accessDecision(undefined, secret), 'unauthorized')
  assert.equal(accessDecision(header, secret), 'authorized')
  assert.equal(accessDecision(header, 'different-private-secret'), 'unauthorized')
  assert.equal(accessDecision(header, 'short'), 'unconfigured')
})
