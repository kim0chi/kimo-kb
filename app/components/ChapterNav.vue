<script setup lang="ts">
// The sidebar. On a notebook it shows a switcher + that notebook's nav (chapters,
// notes, decisions); on the library home it lists the notebooks.
const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const { statusOf, progressOf } = useReadingState()
const { hasNote } = useNotes()

const currentId = useCurrentNotebookId()
const { notebooks, byId } = useNotebookList()
const currentNb = computed(() => byId(currentId.value))

const { data } = await useFetch(() => `/api/nav?notebook=${currentId.value ?? ''}`, {
  key: () => `nav:${currentId.value ?? '_'}`,
})

const strategy = computed(() => data.value?.strategy)
const extraGroups = computed(() => [
  { key: 'notes', label: 'Working notes', items: data.value?.notes ?? [] },
  { key: 'decisions', label: 'Decisions', items: data.value?.decisions ?? [] },
])

function onSwitch(e: Event) {
  const id = (e.target as HTMLSelectElement).value
  emit('navigate')
  navigateTo(`/${id}`)
}

// Collapsible chapters: short ones open, long ones (Ch 4) collapsed; the chapter
// holding the current doc is always kept open.
const expanded = ref<Set<number>>(new Set())
const chapterOf = (path: string) =>
  (data.value?.chapters ?? []).find((ch) => ch.docs.some((d) => d.path === path))

watch(
  () => data.value,
  (d) => {
    expanded.value = new Set((d?.chapters ?? []).filter((c) => c.docs.length <= 3).map((c) => c.number))
    const cur = chapterOf(route.path)
    if (cur) expanded.value.add(cur.number)
  },
  { immediate: true },
)
watch(
  () => route.path,
  () => {
    const cur = chapterOf(route.path)
    if (cur) expanded.value = new Set(expanded.value).add(cur.number)
  },
)
function toggleCh(n: number) {
  const s = new Set(expanded.value)
  s.has(n) ? s.delete(n) : s.add(n)
  expanded.value = s
}
</script>

<template>
  <nav class="nav">
    <div class="top">
      <NuxtLink to="/" class="lib-link" @click="emit('navigate')">☰ Library</NuxtLink>
      <select v-if="currentId && notebooks.length > 1" class="nb-select" :value="currentId" @change="onSwitch">
        <option v-for="nb in notebooks" :key="nb.id" :value="nb.id">{{ nb.title }}</option>
      </select>
    </div>

    <template v-if="currentId">
      <div class="links">
        <NuxtLink :to="`/${currentId}`" class="nav-home" @click="emit('navigate')">Overview</NuxtLink>
        <NuxtLink v-if="currentNb?.hasGlossary" :to="`/${currentId}/glossary`" class="nav-home" @click="emit('navigate')">Glossary</NuxtLink>
        <NuxtLink v-if="(currentNb?.cardCount ?? 0) > 0" :to="`/${currentId}/review`" class="nav-home review-link" @click="emit('navigate')">
          Review<span v-if="currentNb?.due" class="due">{{ currentNb.due }}</span>
        </NuxtLink>
        <NuxtLink to="/help" class="nav-home" @click="emit('navigate')">Help</NuxtLink>
      </div>

      <template v-if="strategy === 'reading-order'">
      <ol class="chapters">
        <li v-for="ch in data?.chapters" :key="ch.number" class="chapter">
          <button class="chapter-head" :aria-expanded="expanded.has(ch.number)" @click="toggleCh(ch.number)">
            <span class="caret" :class="{ open: expanded.has(ch.number) }">▸</span>
            <span class="chapter-title">Ch {{ ch.number }} — {{ ch.title }}</span>
            <span class="progress">
              {{ progressOf(ch.docs.map((d) => d.path)).done }}/{{ progressOf(ch.docs.map((d) => d.path)).total }}
            </span>
          </button>
          <ul v-show="expanded.has(ch.number)" class="docs">
            <li v-for="doc in ch.docs" :key="doc.target">
              <NuxtLink v-if="doc.path" :to="doc.path" class="doc-link" :class="{ active: route.path === doc.path }" @click="emit('navigate')">
                <StatusDot :status="statusOf(doc.path)" />
                <span class="doc-title">{{ doc.title || doc.alias }}</span>
                <span v-if="hasNote(doc.path)" class="note-flag" title="Has notes">✎</span>
              </NuxtLink>
              <span v-else class="doc-missing" :title="`Unresolved: [[${doc.target}]]`">{{ doc.alias }}</span>
            </li>
          </ul>
        </li>
      </ol>

      <section v-for="grp in extraGroups" :key="grp.key" class="group">
        <h3 v-if="grp.items.length" class="group-title">{{ grp.label }}</h3>
        <ul class="docs flat">
          <li v-for="d in grp.items" :key="d.path">
            <NuxtLink :to="d.path" class="doc-link" :class="{ active: route.path === d.path }" @click="emit('navigate')">
              <StatusDot :status="statusOf(d.path)" />
              <span class="doc-title">{{ d.title }}</span>
              <span v-if="d.status" class="st-badge" :class="d.status">{{ d.status }}</span>
              <span v-if="hasNote(d.path)" class="note-flag">✎</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
      </template>

      <!-- tree / flat notebooks: generic sections -->
      <template v-else>
        <section v-for="s in data?.sections" :key="s.id" class="group">
          <h3 v-if="s.title && s.title !== 'All'" class="group-title">{{ s.title }}</h3>
          <ul class="docs flat">
            <li v-for="d in s.docs" :key="d.path">
              <NuxtLink :to="d.path" class="doc-link" :class="{ active: route.path === d.path }" @click="emit('navigate')">
                <StatusDot :status="statusOf(d.path)" />
                <span class="doc-title">{{ d.title }}</span>
                <span v-if="d.difficulty" class="st-badge" :class="d.difficulty.toLowerCase()">{{ d.difficulty }}</span>
                <span v-if="hasNote(d.path)" class="note-flag">✎</span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </template>
    </template>

    <template v-else>
      <div class="links"><NuxtLink to="/help" class="nav-home" @click="emit('navigate')">Help</NuxtLink></div>
      <h3 class="group-title">Notebooks</h3>
      <ul class="docs flat">
        <li v-for="nb in notebooks" :key="nb.id">
          <NuxtLink :to="`/${nb.id}`" class="doc-link" @click="emit('navigate')">
            <span class="doc-title">{{ nb.title }}</span>
          </NuxtLink>
        </li>
      </ul>
    </template>
  </nav>
</template>

<style scoped>
.top { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
.lib-link { font-weight: 600; color: var(--text); flex: 0 0 auto; }
.nb-select {
  flex: 1 1 auto; min-width: 0; background: var(--panel); color: var(--text);
  border: 1px solid var(--border); border-radius: 6px; padding: 0.25rem 0.4rem; font: inherit; font-size: 0.82rem;
}
.links { margin-bottom: 0.75rem; }
.nav-home { display: inline-block; margin-right: 1rem; font-weight: 600; color: var(--text); font-size: 0.9rem; }
.review-link { position: relative; }
.due { display: inline-block; margin-left: 0.3rem; font-size: 0.66rem; font-weight: 700; color: var(--on-accent); background: var(--accent); border-radius: 999px; padding: 0.02rem 0.4rem; vertical-align: 1px; }
.chapters { list-style: none; margin: 0; padding: 0; }
.chapter { margin-bottom: 0.5rem; }
.chapter-head {
  width: 100%; display: flex; gap: 0.5rem; align-items: center; justify-content: space-between;
  background: none; border: none; color: var(--text); cursor: pointer;
  padding: 0.35rem 0.25rem; text-align: left; border-radius: 6px;
}
.chapter-head:hover { background: var(--panel); }
.caret { color: var(--muted); font-size: 0.7rem; transition: transform 0.15s; flex: 0 0 auto; }
.caret.open { transform: rotate(90deg); }
.chapter-title { font-weight: 600; font-size: 0.9rem; flex: 1 1 auto; }
.progress { font-size: 0.72rem; color: var(--muted); flex: 0 0 auto; }
.docs { list-style: none; margin: 0.1rem 0 0.4rem; padding-left: 1.35rem; }
.docs li { margin: 0; }
.doc-link { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--muted); padding: 0.32rem 0.25rem; border-radius: 6px; }
.doc-link:hover { background: var(--panel); }
.doc-link.active { color: var(--accent); font-weight: 600; }
.note-flag { font-size: 0.72rem; color: var(--muted); flex: 0 0 auto; }
.doc-title { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.group { margin-top: 1.5rem; }
.group-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin: 0 0 0.4rem; }
.docs.flat { padding-left: 0; }
.st-badge { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.03em; padding: 0.02rem 0.35rem; border-radius: 4px; border: 1px solid var(--border); color: var(--muted); flex: 0 0 auto; }
.st-badge.fixed, .st-badge.committed, .st-badge.easy { color: var(--good); border-color: var(--good); }
.st-badge.planning, .st-badge.investigating, .st-badge.medium { color: var(--serious); border-color: var(--serious); }
.st-badge.hard { color: var(--critical); border-color: var(--critical); }
.doc-missing { font-size: 0.9rem; color: var(--faint); font-style: italic; }
</style>
