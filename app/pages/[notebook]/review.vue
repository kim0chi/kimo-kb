<script setup lang="ts">
// Spaced-repetition review: flip each due card, grade it, and the schedule updates.
import { isDue, schedule, GRADES } from '~~/lib/srs'

interface Card { id: string; front: string; back: string; doc: string }
const route = useRoute()
const notebook = computed(() => route.params.notebook as string)

const { data } = await useFetch(() => `/api/flashcards?notebook=${notebook.value}`, {
  key: () => `cards:${notebook.value}`,
})
const { data: nav } = await useFetch(() => `/api/nav?notebook=${notebook.value}`, {
  key: () => `nav:${notebook.value}`,
})

const today = new Date().toISOString().slice(0, 10)
const states = ref<Record<string, { ease: number; interval: number; reps: number; due: string }>>({})
const queue = ref<Card[]>([])
const idx = ref(0)
const showBack = ref(false)
const reviewed = ref(0)

onMounted(() => {
  states.value = { ...(data.value?.states ?? {}) }
  queue.value = (data.value?.cards ?? []).filter((c) => isDue(states.value[c.id], today))
})

const current = computed(() => queue.value[idx.value])
const remaining = computed(() => Math.max(0, queue.value.length - idx.value))

// Little "1d / 3d" preview under each grade button.
function preview(grade: number): string {
  if (!current.value) return ''
  const s = schedule(states.value[current.value.id] ?? null, grade, new Date())
  return s.interval === 0 ? 'today' : s.interval === 1 ? '1d' : `${s.interval}d`
}

async function grade(g: number) {
  const card = current.value
  if (!card) return
  const { sched } = await $fetch<{ sched: any }>('/api/flashcards', {
    method: 'POST',
    body: { id: card.id, grade: g },
  })
  states.value = { ...states.value, [card.id]: sched }
  reviewed.value++
  if (g === 0) queue.value.push(card) // "Again" — see it again this session
  idx.value++
  showBack.value = false
}

function onKey(e: KeyboardEvent) {
  if (!current.value) return
  if (e.key === ' ') {
    e.preventDefault()
    showBack.value = true
  } else if (showBack.value && ['1', '2', '3', '4'].includes(e.key)) {
    grade(Number(e.key) - 1)
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="review">
    <nav class="crumb" aria-label="Breadcrumb">
      <NuxtLink to="/">Library</NuxtLink>
      <span class="sep">›</span>
      <NuxtLink :to="`/${notebook}`">{{ nav?.notebook?.title || notebook }}</NuxtLink>
      <span class="sep">›</span>
      <span class="crumb-here">Review</span>
    </nav>

    <div v-if="!data?.cards?.length" class="empty">
      <h1>No flashcards yet</h1>
      <p>
        Add cards to any doc in this notebook with a fenced <code>flashcard</code> block:
      </p>
      <pre><code>```flashcard
What does a foreign key do?
---
Links two tables — it holds another table's primary key.
```</code></pre>
    </div>

    <div v-else-if="current" class="session">
      <div class="head">
        <h1>Review</h1>
        <span class="remaining">{{ remaining }} left · {{ reviewed }} done</span>
      </div>

      <div class="card" @click="showBack = true">
        <div class="face front"><span class="face-label">Question</span>{{ current.front }}</div>
        <div v-if="showBack" class="face back"><span class="face-label">Answer</span>{{ current.back }}</div>
        <p v-if="current.doc" class="source">from {{ current.doc }}</p>
      </div>

      <div v-if="!showBack" class="reveal">
        <button class="show-btn" @click="showBack = true">Show answer <kbd>space</kbd></button>
      </div>
      <div v-else class="grades">
        <button v-for="(g, i) in GRADES" :key="g" class="grade" :class="g.toLowerCase()" @click="grade(i)">
          {{ g }}<span class="ivl">{{ preview(i) }}</span>
        </button>
      </div>
    </div>

    <div v-else class="done">
      <h1>All caught up 🎉</h1>
      <p>You reviewed {{ reviewed }} card{{ reviewed === 1 ? '' : 's' }}. Nothing else due today.</p>
      <NuxtLink :to="`/${notebook}`" class="back">← Back to {{ nav?.notebook?.title || notebook }}</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.crumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--muted); margin-bottom: 1rem; }
.crumb a { color: var(--muted); }
.crumb a:hover { color: var(--accent); }
.sep { opacity: 0.55; }
.crumb-here { color: var(--text); }

.head { display: flex; align-items: baseline; justify-content: space-between; }
.head h1 { margin: 0; }
.remaining { font-size: 0.85rem; color: var(--muted); }

.card {
  margin: 1.5rem 0; border: 1px solid var(--border); border-radius: 12px;
  padding: 1.75rem 1.5rem; background: var(--panel); min-height: 9rem; cursor: pointer;
}
.face { font-size: 1.15rem; line-height: 1.5; white-space: pre-wrap; }
.face.back { margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid var(--border); color: var(--text); }
.face-label { display: block; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 0.5rem; }
.source { margin: 1.25rem 0 0; font-size: 0.75rem; color: var(--faint); }

.reveal { text-align: center; }
.show-btn {
  background: var(--accent); color: var(--on-accent); border: none; border-radius: 8px;
  padding: 0.6rem 1.4rem; font-weight: 600; font-size: 0.95rem; cursor: pointer;
}
.show-btn kbd { font-family: var(--font-mono); font-size: 0.72em; margin-left: 0.5rem; opacity: 0.8; }

.grades { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; }
.grade {
  display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
  border: 1px solid var(--border); background: var(--panel); color: var(--text);
  border-radius: 8px; padding: 0.6rem; font-weight: 600; cursor: pointer;
}
.grade:hover { border-color: var(--accent); }
.grade .ivl { font-size: 0.72rem; font-weight: 400; color: var(--muted); }
.grade.again { border-bottom: 2px solid var(--critical); }
.grade.hard { border-bottom: 2px solid var(--serious); }
.grade.good { border-bottom: 2px solid var(--accent); }
.grade.easy { border-bottom: 2px solid var(--good); }

.empty pre, .done, .empty { color: var(--muted); }
.empty code, .empty pre code { font-family: var(--font-mono); }
.empty pre { background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 0.9rem 1rem; overflow-x: auto; color: var(--text); }
.done { text-align: center; padding-top: 2rem; }
.done h1 { margin-bottom: 0.5rem; }
.back { color: var(--accent); }
</style>
