import { listArtifacts } from '../../utils/artifacts'

export default defineEventHandler(() => ({ items: listArtifacts() }))
