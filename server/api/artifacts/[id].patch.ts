import { setArtifactRead } from '../../utils/artifacts'

export default defineEventHandler(async event => {
  const body = await readBody(event)
  if (typeof body?.read !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Choose read or unread.' })
  }
  const artifact = setArtifactRead(getRouterParam(event, 'id') || '', body.read)
  if (!artifact) throw createError({ statusCode: 404, statusMessage: 'Guide not found.' })
  return { artifact }
})
