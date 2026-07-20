<script setup lang="ts">
// Per-doc notes: a plain-text area, debounced autosave, saved on blur too.
const props = defineProps<{ path: string }>()
const { saveNote } = useNotes()

const body = ref('')
const status = ref<'idle' | 'saving' | 'saved'>('idle')
const updatedAt = ref<string | null>(null)

// Load this doc's note (client-side; notes are private state, not content).
const { data } = await useAsyncData(`note:${props.path}`, () =>
  $fetch<{ note: { body: string; updatedAt: string } | null }>('/api/notes', {
    query: { path: props.path },
  }),
)
body.value = data.value?.note?.body ?? ''
updatedAt.value = data.value?.note?.updatedAt ?? null

let timer: ReturnType<typeof setTimeout> | null = null
async function save() {
  if (timer) { clearTimeout(timer); timer = null }
  status.value = 'saving'
  const res = await saveNote(props.path, body.value)
  updatedAt.value = res.hasNote ? res.updatedAt : null
  status.value = 'saved'
}

watch(body, () => {
  status.value = 'idle'
  if (timer) clearTimeout(timer)
  timer = setTimeout(save, 900) // debounce autosave
})
onBeforeUnmount(() => timer && clearTimeout(timer))

const when = computed(() =>
  updatedAt.value ? new Date(updatedAt.value).toLocaleString() : null,
)
</script>

<template>
  <section class="notes">
    <div class="notes-head">
      <h2>Notes</h2>
      <span class="state" :class="status">
        {{ status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : when ? 'Edited' : '' }}
      </span>
    </div>
    <textarea
      v-model="body"
      class="notes-area"
      placeholder="Your private notes for this doc — autosaved."
      rows="6"
      @blur="save"
    />
    <p v-if="when" class="notes-meta">Last saved {{ when }}</p>
  </section>
</template>

<style scoped>
.notes { margin-top: 3rem; border-top: 1px solid var(--border); padding-top: 1.25rem; }
.notes-head { display: flex; align-items: baseline; justify-content: space-between; }
.notes-head h2 { margin: 0; font-size: 1.1rem; }
.state { font-size: 0.78rem; color: var(--muted); }
.state.saved { color: var(--done); }
.notes-area {
  width: 100%; margin-top: 0.6rem; padding: 0.7rem 0.85rem;
  background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
  color: var(--text); font: inherit; font-size: 0.92rem; line-height: 1.5; resize: vertical;
}
.notes-area:focus { outline: none; border-color: var(--accent); }
.notes-meta { font-size: 0.75rem; color: var(--muted); margin: 0.4rem 0 0; }
</style>
