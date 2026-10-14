import { registerRunner } from '../../utils/agent-jobs'

export default defineEventHandler(async event => ({
  runner: registerRunner(await readBody(event)),
}))
