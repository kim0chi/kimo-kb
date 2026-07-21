<script setup lang="ts">
// ⌘K / Ctrl-K quick-jump palette: fuzzy-ish search over every doc, glossary term,
// and the top-level pages, then navigate on Enter. Mounted once, globally.
const { open, show, hide } = useQuickJump()

const { data: nav } = await useFetch('/api/nav')
const { data: glossary } = await useFetch('/api/glossary')

interface Item {
  title: string
  path: string
  kind: string
}

const items = computed<Item[]>(() => {
  const out: Item[] = [
    { title: 'The path (home)', path: '/', kind: 'Page' },
    { title: 'Glossary', path: '/glossary', kind: 'Page' },
    { title: 'Help', path: '/help', kind: 'Page' },
  ]
  for (const d of nav.value?.docs ?? []) {
    if (d.path) out.push({ title: d.title || d.path, path: d.path, kind: 'Doc' })
  }
  for (const t of glossary.value?.terms ?? []) {
    out.push({ title: t.term, path: `/glossary#${t.slug}`, kind: 'Term' })
  }
  return out
})

const q = ref('')
const active = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)

const results = computed<Item[]>(() => {
  const needle = q.value.trim().toLowerCase()
  if (!needle) return items.value.slice(0, 12)
  const scored = items.value
    .map((it) => {
      const t = it.title.toLowerCase()
      const idx = t.indexOf(needle)
      if (idx === -1) return null
      // startsWith beats mid-word; shorter titles rank higher.
      return { it, score: (idx === 0 ? 0 : 100) + idx + it.title.length * 0.01 }
    })
    .filter((x): x is { it: Item; score: number } => !!x)
    .sort((a, b) => a.score - b.score)
  return scored.slice(0, 20).map((x) => x.it)
})

watch(q, () => (active.value = 0))
watch(open, (o) => {
  if (o) {
    q.value = ''
    active.value = 0
    nextTick(() => inputEl.value?.focus())
  }
})

function go(item?: Item) {
  const target = item ?? results.value[active.value]
  if (!target) return
  hide()
  navigateTo(target.path)
}

function onList(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = Math.min(active.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = Math.max(active.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    go()
  } else if (e.key === 'Escape') {
    hide()
  }
}

function onGlobalKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    open.value ? hide() : show()
  }
}
onMounted(() => window.addEventListener('keydown', onGlobalKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="qj-overlay" @click.self="hide">
      <div class="qj" role="dialog" aria-label="Quick jump">
        <input
          ref="inputEl"
          v-model="q"
          class="qj-input"
          type="text"
          placeholder="Jump to a doc or term…"
          autofocus
          @keydown="onList"
        >
        <ul v-if="results.length" class="qj-list">
          <li
            v-for="(r, i) in results"
            :key="r.path"
            class="qj-item"
            :class="{ active: i === active }"
            @mouseenter="active = i"
            @click="go(r)"
          >
            <span class="qj-title">{{ r.title }}</span>
            <span class="qj-kind">{{ r.kind }}</span>
          </li>
        </ul>
        <p v-else class="qj-empty">No matches for “{{ q }}”.</p>
        <div class="qj-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.qj-overlay {
  position: fixed; inset: 0; z-index: 100; background: rgba(0, 0, 0, 0.45);
  display: flex; justify-content: center; align-items: flex-start; padding: 12vh 1rem 1rem;
}
.qj {
  width: min(38rem, 100%); background: var(--panel); border: 1px solid var(--border);
  border-radius: 12px; overflow: hidden; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
}
.qj-input {
  width: 100%; border: none; border-bottom: 1px solid var(--border);
  background: transparent; color: var(--text); font: inherit; font-size: 1.05rem;
  padding: 0.9rem 1.1rem; outline: none;
}
.qj-list { list-style: none; margin: 0; padding: 0.3rem; max-height: 50vh; overflow-y: auto; }
.qj-item {
  display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem;
  padding: 0.5rem 0.8rem; border-radius: 8px; cursor: pointer;
}
.qj-item.active { background: var(--accent-soft); }
.qj-title { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qj-kind { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); flex: 0 0 auto; }
.qj-empty { padding: 1.2rem; color: var(--muted); margin: 0; }
.qj-foot {
  display: flex; gap: 1rem; padding: 0.55rem 1rem; border-top: 1px solid var(--border);
  font-size: 0.72rem; color: var(--muted);
}
.qj-foot kbd {
  font-family: var(--font-mono); background: var(--bg); border: 1px solid var(--border);
  border-radius: 4px; padding: 0 0.3rem; margin-right: 0.15rem;
}
</style>
