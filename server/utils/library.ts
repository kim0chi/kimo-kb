import { loadNotebooks } from '../../lib/notebooks'

// Loads the notebook library from runtime config (the library dir + fallback root).
export function getNotebooks(event?: Parameters<typeof useRuntimeConfig>[0]) {
  const { library, contentRoot } = useRuntimeConfig(event)
  return loadNotebooks(library as string, contentRoot as string)
}
