<script setup lang="ts">
// Exercises: write an answer from memory, then reveal and grade your own explanation.
// Retrieval first, comparison second — revealing before attempting is the whole thing
// you're trying not to do, so the answer box comes before the reveal button.
import { isDue, schedule, CONFIDENCE } from '~~/lib/srs'

interface DocRef { path: string; title: string | null; exists: boolean }
interface Exercise {
  id: string
  prompt: string
  answer: string | null
  refs: DocRef[]
  difficulty: string | null
  tags: string[]
  source: string
}
interface Sched { ease: number; interval: number; reps: number; due: string; attempt: string }

const route = useRoute()
const notebook = computed(() => route.params.notebook as string)

const { data } = await useFetch(() => `/api/exercises?notebook=${notebook.value}`, {
  key: () => `exercises:${notebook.value}`,
})
const { data: nav } = await useFetch(() => `/api/nav?notebook=${notebook.value}`, {
  key: () => `nav:${notebook.value}`,
})
useHead(() => ({ title: `Exercises — ${nav.value?.notebook?.title || notebook.value}` }))

const today = new Date().toISOString().slice(0, 10)
const states = ref<Record<string, Sched>>({})
const queue = ref<Exercise[]>([])
const idx = ref(0)
const revealed = ref(false)
const attempt = ref('')
const reviewed = ref(0)

onMounted(() => {
  states.value = { ...(data.value?.states ?? {}) }
  queue.value = (data.value?.exercises ?? []).filter((e) => isDue(states.value[e.id], today))
})

const current = computed(() => queue.value[idx.value])
const remaining = computed(() => Math.max(0, queue.value.length - idx.value))
/** What you wrote the last time this one came up — shown only after revealing. */
const previous = computed(() => (current.value ? states.value[current.value.id]?.attempt || '' : ''))

function preview(grade: number): string {
  if (!current.value) return ''
  const s = schedule(states.value[current.value.id] ?? null, grade, new Date())
  return s.interval === 0 ? 'today' : s.interval === 1 ? '1d' : `${s.interval}d`
}

async function grade(g: number) {
  const ex = current.value
  if (!ex) return
  const { sched } = await $fetch<{ sched: Sched }>('/api/exercises', {
    method: 'POST',
    body: { id: ex.id, grade: g, attempt: attempt.value },
  })
  states.value = { ...states.value, [ex.id]: sched }
  reviewed.value++
  if (g === 0) queue.value.push(ex) // missed it — come back to it this session
  idx.value++
  revealed.value = false
  attempt.value = ''
}

function onKey(e: KeyboardEvent) {
  if (!current.value) return
  // Digits are for grading, but only once you're out of the answer box — otherwise
  // typing "3 queues" in your answer would grade the exercise.
  const typing = (e.target as HTMLElement | null)?.tagName === 'TEXTAREA'
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    revealed.value = true
  } else if (revealed.value && !typing && ['1', '2', '3', '4'].includes(e.key)) {
    grade(Number(e.key) - 1)
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="exercises">
    <nav class="crumb" aria-label="Breadcrumb">
      <NuxtLink to="/">Library</NuxtLink>
      <span class="sep">›</span>
      <NuxtLink :to="`/${notebook}`">{{ nav?.notebook?.title || notebook }}</NuxtLink>
      <span class="sep">›</span>
      <span class="crumb-here">Exercises</span>
    </nav>

    <ul v-if="data?.errors?.length" class="errors">
      <li v-for="(e, i) in data.errors" :key="i">{{ e }}</li>
    </ul>

    <div v-if="!data?.exercises?.length" class="empty">
      <h1>No exercises yet</h1>
      <p>
        Exercises ask you to explain something in your own words. They come from two
        places — a YAML file you write, or the learning path's objectives.
      </p>
      <p>Add <code>exercises/&lt;topic&gt;.yaml</code> to the library:</p>
      <pre><code>notebook: {{ notebook }}
title: Architecture
exercises:
  - prompt: Draw the request path through the app's layers.
    answer: |
      A request enters through the route, which hands off to…
    refs: [/{{ notebook }}/si-docs/sections/03-system-architecture]
    difficulty: medium</code></pre>
      <p class="fine">
        Any step in <code>roadmap.yaml</code> that states an <code>objective:</code> also
        becomes an exercise automatically, once the docs it points at exist.
      </p>
    </div>

    <div v-else-if="current" class="session">
      <div class="head">
        <h1>Exercises</h1>
        <span class="remaining">{{ remaining }} left · {{ reviewed }} done</span>
      </div>

      <section class="card">
        <span class="face-label">Prompt</span>
        <p class="prompt">{{ current.prompt }}</p>
        <p class="source">
          {{ current.source }}
          <span v-if="current.difficulty" class="diff" :class="current.difficulty.toLowerCase()">
            {{ current.difficulty }}
          </span>
        </p>
      </section>

      <section class="block">
        <label class="face-label" for="attempt">Your answer — from memory</label>
        <textarea
          id="attempt"
          v-model="attempt"
          class="attempt"
          rows="7"
          placeholder="Explain it in your own words. Getting it wrong here is the useful part."
        />
      </section>

      <div v-if="!revealed" class="reveal">
        <button class="show-btn" @click="revealed = true">
          Reveal answer <kbd>⌘↵</kbd>
        </button>
      </div>

      <template v-else>
        <section class="block">
          <span class="face-label">{{ current.answer ? 'Model answer' : 'Check yourself against' }}</span>
          <div v-if="current.answer" class="answer">
            <MDC :value="current.answer" />
          </div>
          <p v-else class="no-answer">
            This one came from the learning path, so there's no written answer — reread the
            source and judge your own.
          </p>
          <ul v-if="current.refs.length" class="refs">
            <li v-for="r in current.refs" :key="r.path">
              <NuxtLink v-if="r.exists" :to="r.path">{{ r.title || r.path }}</NuxtLink>
              <span v-else class="missing">{{ r.path }} — not written yet</span>
            </li>
          </ul>
        </section>

        <section v-if="previous" class="block">
          <span class="face-label">Last time you wrote</span>
          <p class="previous">{{ previous }}</p>
        </section>

        <div class="grades">
          <button
            v-for="(c, i) in CONFIDENCE"
            :key="c"
            class="grade"
            :class="['missed', 'shaky', 'solid', 'nailed'][i]"
            @click="grade(i)"
          >
            {{ c }}<span class="ivl">{{ preview(i) }}</span>
          </button>
        </div>
      </template>
    </div>

    <div v-else class="done">
      <h1>All caught up 🎉</h1>
      <p>
        You worked through {{ reviewed }} exercise{{ reviewed === 1 ? '' : 's' }}. Nothing else
        due today.
      </p>
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

.errors {
  list-style: none; margin: 0 0 1.25rem; padding: 0.75rem 1rem; font-size: 0.82rem;
  border: 1px solid var(--serious); border-radius: 8px; color: var(--serious);
}

.head { display: flex; align-items: baseline; justify-content: space-between; }
.head h1 { margin: 0; }
.remaining { font-size: 0.85rem; color: var(--muted); }

.face-label { display: block; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 0.5rem; }

.card { margin: 1.5rem 0; border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; background: var(--panel); }
.prompt { font-size: 1.15rem; line-height: 1.5; margin: 0; }
.source { margin: 1rem 0 0; font-size: 0.75rem; color: var(--faint); display: flex; align-items: center; gap: 0.5rem; }
.diff { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.03em; padding: 0.03rem 0.4rem; border-radius: 4px; border: 1px solid var(--border); }
.diff.easy { color: var(--good); border-color: var(--good); }
.diff.medium { color: var(--serious); border-color: var(--serious); }
.diff.hard { color: var(--critical); border-color: var(--critical); }

.block { margin-bottom: 1.5rem; }
.attempt {
  width: 100%; box-sizing: border-box; resize: vertical;
  background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px;
  padding: 0.85rem 1rem; color: var(--text); font-family: var(--font-sans);
  font-size: 0.95rem; line-height: 1.6;
}
.attempt:focus { outline: none; border-color: var(--accent); }

.answer { border-left: 2px solid var(--accent); padding-left: 1rem; }
.answer :deep(p) { margin: 0 0 0.75rem; line-height: 1.65; }
.answer :deep(p:last-child) { margin-bottom: 0; }
.answer :deep(ul), .answer :deep(ol) { margin: 0 0 0.75rem; padding-left: 1.25rem; line-height: 1.65; }
.answer :deep(code) { font-family: var(--font-mono); font-size: 0.88em; background: var(--panel-2); padding: 0.05rem 0.3rem; border-radius: 4px; }
.answer :deep(pre) { background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 0.85rem 1rem; overflow-x: auto; }
.answer :deep(pre code) { background: none; padding: 0; }
.no-answer { color: var(--muted); margin: 0; font-style: italic; }

.refs { list-style: none; margin: 0.9rem 0 0; padding: 0; font-size: 0.85rem; }
.refs li { padding: 0.15rem 0; }
.refs a { color: var(--accent); }
.missing { color: var(--faint); }

.previous { margin: 0; white-space: pre-wrap; color: var(--muted); font-size: 0.9rem; line-height: 1.6; border-left: 2px solid var(--border); padding-left: 1rem; }

.reveal { text-align: center; margin-bottom: 1.5rem; }
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
.grade.missed { border-bottom: 2px solid var(--critical); }
.grade.shaky { border-bottom: 2px solid var(--serious); }
.grade.solid { border-bottom: 2px solid var(--accent); }
.grade.nailed { border-bottom: 2px solid var(--good); }

.empty { color: var(--muted); }
.empty code { font-family: var(--font-mono); }
.empty pre { background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 0.9rem 1rem; overflow-x: auto; color: var(--text); }
.fine { font-size: 0.85rem; }
.done { text-align: center; padding-top: 2rem; }
.done h1 { margin-bottom: 0.5rem; }
.back { color: var(--accent); }
</style>
