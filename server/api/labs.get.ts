import { loadLabs, loadLabById, labsDir } from '../utils/labs'

// Lists labs, or returns one (with its code) when ?id= is given.
export default defineEventHandler((event) => {
  const { library } = useRuntimeConfig(event)
  const id = (getQuery(event).id as string | undefined)?.trim()

  if (id) {
    const lab = loadLabById(library as string, id)
    if (!lab) throw createError({ statusCode: 404, statusMessage: `No lab "${id}"` })
    return { lab }
  }

  // The list view doesn't need the code — keep the payload small.
  const labs = loadLabs(library as string).map(({ solution, tests, ...rest }) => ({
    ...rest,
    hasTests: !!tests,
    solutionLines: solution ? solution.split('\n').length : 0,
  }))
  return { labs, dir: labsDir(library as string) }
})
