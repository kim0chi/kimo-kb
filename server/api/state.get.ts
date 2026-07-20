import { queryCollection } from '@nuxt/content/server'
import { allStates, seedOnce } from '../utils/db'

// Returns the reading-state map (doc_path -> status). Any path not present is 'unread'.
// On first call, imports current progress from the old folder tracker (see seedOnce).
export default defineEventHandler(async (event) => {
  const rows = await queryCollection(event, 'docs').select('path').all()
  const paths = rows.map((r) => r.path).filter((p): p is string => !!p)

  seedOnce(paths, new Date().toISOString())

  return { states: allStates() }
})
