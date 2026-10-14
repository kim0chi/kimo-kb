import { getArtifact } from '../../utils/artifacts'

export default defineEventHandler(event => {
  const artifact = getArtifact(getRouterParam(event, 'id') || '')
  if (!artifact) throw createError({ statusCode: 404, statusMessage: 'Guide not found.' })
  return { artifact }
})
