import { getNote, notedPaths } from '../utils/db'

// With ?path= → that doc's note. Without → the list of paths that have notes
// (used for indicators in the nav and index).
export default defineEventHandler((event) => {
  const path = (getQuery(event).path as string | undefined)?.trim()
  if (path) {
    return { path, note: getNote(path) }
  }
  return { paths: notedPaths() }
})
