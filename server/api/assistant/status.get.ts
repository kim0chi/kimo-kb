import { allowedSources } from '../../utils/assistant'

export default defineEventHandler(async event => ({
  configured: !!process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-6.1-sol',
  sources: await allowedSources(event),
}))
