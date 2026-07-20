// Shared note-presence store (which docs have notes) + a save that keeps it in
// sync. The note bodies themselves are fetched per-doc in NotesPanel.
export function useNotes() {
  const notedPaths = useState<string[]>('noted-paths', () => [])

  useAsyncData('noted-paths', async () => {
    const res = await $fetch<{ paths: string[] }>('/api/notes')
    notedPaths.value = res.paths
    return res.paths
  })

  function hasNote(path: string | null | undefined): boolean {
    return !!path && notedPaths.value.includes(path)
  }

  async function saveNote(path: string, body: string): Promise<{ updatedAt: string; hasNote: boolean }> {
    const res = await $fetch<{ updatedAt: string; hasNote: boolean }>('/api/notes', {
      method: 'POST',
      body: { path, body },
    })
    const set = new Set(notedPaths.value)
    if (res.hasNote) set.add(path)
    else set.delete(path)
    notedPaths.value = [...set]
    return res
  }

  return { notedPaths, hasNote, saveNote }
}
