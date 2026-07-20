export type Status = 'unread' | 'reading' | 'done'

// Shared, reactive reading-state store backed by /api/state (SQLite).
// One fetch is shared across all components via useState + useAsyncData keying.
export function useReadingState() {
  const states = useState<Record<string, Status>>('reading-states', () => ({}))

  const { refresh, pending } = useAsyncData('reading-states', async () => {
    const res = await $fetch<{ states: Record<string, Status> }>('/api/state')
    states.value = res.states
    return res.states
  })

  function statusOf(path: string | null | undefined): Status {
    return (path && states.value[path]) || 'unread'
  }

  async function setStatus(path: string, status: Status) {
    const prev = states.value[path]
    states.value = { ...states.value, [path]: status } // optimistic
    try {
      await $fetch('/api/state', { method: 'POST', body: { path, status } })
    } catch (e) {
      // Roll back on failure.
      const next = { ...states.value }
      if (prev === undefined) delete next[path]
      else next[path] = prev
      states.value = next
      throw e
    }
  }

  /** Mark a doc as 'reading' the first time it's opened (never downgrades). */
  async function markOpened(path: string) {
    if (statusOf(path) === 'unread') await setStatus(path, 'reading')
  }

  /** {done,total} over a set of doc paths. */
  function progressOf(paths: (string | null | undefined)[]): { done: number; total: number } {
    const real = paths.filter((p): p is string => !!p)
    return { done: real.filter((p) => statusOf(p) === 'done').length, total: real.length }
  }

  return { states, statusOf, setStatus, markOpened, progressOf, refresh, pending }
}
