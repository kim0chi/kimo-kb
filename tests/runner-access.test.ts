import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { runnerAccessDecision } from '../server/utils/runner-access.ts'

test('runner routes require a separate long bearer token', () => {
  const token = 'example-runner-token-32-characters-long'
  assert.equal(runnerAccessDecision(undefined, undefined), 'unconfigured')
  assert.equal(runnerAccessDecision(undefined, 'short'), 'unconfigured')
  assert.equal(runnerAccessDecision('Basic abc', token), 'unauthorized')
  assert.equal(runnerAccessDecision('Bearer wrong-token', token), 'unauthorized')
  assert.equal(runnerAccessDecision('Bearer ' + token, token), 'authorized')
})
