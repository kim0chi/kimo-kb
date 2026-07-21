export interface NotebookMeta {
  id: string
  title: string
  description: string | null
  kind: string
  hasGlossary: boolean
  docCount?: number
}

// The current notebook id from the route (/[notebook]/...), or null on the library
// home / global pages.
export function useCurrentNotebookId() {
  const route = useRoute()
  return computed(() => (route.params.notebook as string) || null)
}

// The library's notebooks (shared fetch).
export function useNotebookList() {
  const { data } = useFetch<{ notebooks: NotebookMeta[] }>('/api/notebooks', { key: 'notebooks' })
  const notebooks = computed(() => data.value?.notebooks ?? [])
  const byId = (id: string | null) => notebooks.value.find((n) => n.id === id)
  return { notebooks, byId }
}
