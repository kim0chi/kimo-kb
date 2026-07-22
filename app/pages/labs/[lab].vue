<script setup lang="ts">
// A single lab: the prompt, your solution as it is on disk, and a Run button that
// executes it in the browser sandbox (never on the server).
import { getRunner, type RunResult } from '~~/lib/runners'

const route = useRoute()
const id = computed(() => route.params.lab as string)

const { data } = await useFetch(() => `/api/labs?id=${id.value}`, { key: () => `lab:${id.value}` })
const lab = computed(() => data.value?.lab)
useHead(() => ({ title: lab.value ? `${lab.value.title} — Code Lab` : 'Code Lab' }))

const runner = computed(() => (lab.value ? getRunner(lab.value.lang) : null))
const result = ref<RunResult | null>(null)
const running = ref(false)

async function run() {
  const r = runner.value
  if (!lab.value || !r?.run) return
  running.value = true
  result.value = null
  try {
    result.value = await r.run(lab.value.solution, lab.value.tests)
  } finally {
    running.value = false
  }
}

const passed = computed(() => result.value?.tests.filter((t) => t.ok).length ?? 0)
const failed = computed(() => result.value?.tests.filter((t) => !t.ok).length ?? 0)
</script>

<template>
  <div v-if="lab">
    <nav class="crumb" aria-label="Breadcrumb">
      <NuxtLink to="/">Library</NuxtLink><span class="sep">›</span>
      <NuxtLink to="/labs">Code Lab</NuxtLink><span class="sep">›</span>
      <span class="crumb-here">{{ lab.title }}</span>
    </nav>

    <div class="head">
      <h1>{{ lab.title }}</h1>
      <div class="tags">
        <span v-if="lab.difficulty" class="diff" :class="lab.difficulty.toLowerCase()">{{ lab.difficulty }}</span>
        <span class="lang">{{ runner?.label || lab.lang }}</span>
      </div>
    </div>

    <p v-if="lab.prompt" class="prompt">{{ lab.prompt }}</p>

    <!-- Solution as it is on disk -->
    <section class="block">
      <div class="block-head">
        <h2>Your solution</h2>
        <span class="hint">edit the file in your editor, then re-run</span>
      </div>
      <p v-if="lab.missingSolution" class="missing">
        No <code>solution.{{ lab.lang === 'python' ? 'py' : lab.lang }}</code> in this lab folder yet — create it and refresh.
      </p>
      <pre v-else class="code"><code>{{ lab.solution }}</code></pre>
    </section>

    <div class="actions">
      <button v-if="runner?.available" class="run" :disabled="running || lab.missingSolution" @click="run">
        {{ running ? 'Running…' : '▶ Run' }}
      </button>
      <p v-else class="soon">
        The {{ runner?.label || lab.lang }} runtime isn't installed yet — it'll be self-hosted WASM, coming next.
      </p>
    </div>

    <!-- Results -->
    <section v-if="result" class="block">
      <div class="block-head">
        <h2>Result</h2>
        <span class="hint">{{ result.durationMs }}ms</span>
      </div>

      <div v-if="result.tests.length" class="summary" :class="{ pass: failed === 0, fail: failed > 0 }">
        {{ passed }} passed<span v-if="failed"> · {{ failed }} failed</span>
      </div>
      <ul v-if="result.tests.length" class="tests">
        <li v-for="(t, i) in result.tests" :key="i" :class="{ ok: t.ok }">
          <span class="mark">{{ t.ok ? '✓' : '✕' }}</span>
          <span class="tname">{{ t.name }}</span>
          <span v-if="t.error" class="terr">{{ t.error }}</span>
        </li>
      </ul>

      <pre v-if="result.logs.length" class="out"><code>{{ result.logs.join('\n') }}</code></pre>
      <pre v-if="result.error" class="err"><code>{{ result.error }}</code></pre>
      <p v-if="!result.tests.length && !result.logs.length && !result.error" class="hint">
        Ran cleanly with no output. Add a <code>console.log</code> or a tests file.
      </p>
    </section>

    <section v-if="lab.tests" class="block">
      <div class="block-head"><h2>Tests</h2></div>
      <pre class="code"><code>{{ lab.tests }}</code></pre>
    </section>
  </div>
</template>

<style scoped>
.crumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--muted); margin-bottom: 1rem; flex-wrap: wrap; }
.crumb a { color: var(--muted); }
.sep { opacity: 0.55; }
.crumb-here { color: var(--text); }
.head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
h1 { margin: 0 0 0.25rem; }
.tags { display: flex; gap: 0.35rem; align-items: center; }
.diff { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.03em; padding: 0.03rem 0.4rem; border-radius: 4px; border: 1px solid var(--border); color: var(--muted); }
.diff.easy { color: var(--good); border-color: var(--good); }
.diff.medium { color: var(--serious); border-color: var(--serious); }
.diff.hard { color: var(--critical); border-color: var(--critical); }
.lang { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 0.05rem 0.5rem; }
.prompt { color: var(--muted); white-space: pre-wrap; margin: 0.75rem 0 1.5rem; }

.block { margin-bottom: 1.5rem; }
.block-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem; }
.block-head h2 { margin: 0; font-size: 1rem; }
.hint { font-size: 0.75rem; color: var(--muted); }
.code, .out, .err {
  background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px;
  padding: 0.85rem 1rem; overflow-x: auto; font-family: var(--font-mono); font-size: 0.82rem; line-height: 1.55; margin: 0;
}
.err { border-color: var(--critical); color: var(--critical); }
.out { margin-top: 0.6rem; }
.missing { color: var(--serious); font-size: 0.9rem; }

.actions { margin: 0 0 1.5rem; }
.run {
  background: var(--accent); color: var(--on-accent); border: none; border-radius: 8px;
  padding: 0.5rem 1.1rem; font-weight: 600; font-size: 0.92rem; cursor: pointer;
}
.run:disabled { opacity: 0.5; cursor: default; }
.soon { color: var(--faint); font-style: italic; font-size: 0.88rem; margin: 0; }

.summary { font-weight: 600; font-size: 0.92rem; margin-bottom: 0.5rem; }
.summary.pass { color: var(--good); }
.summary.fail { color: var(--critical); }
.tests { list-style: none; margin: 0 0 0.6rem; padding: 0; }
.tests li { display: flex; gap: 0.5rem; align-items: baseline; padding: 0.25rem 0; font-size: 0.88rem; flex-wrap: wrap; color: var(--critical); }
.tests li.ok { color: var(--good); }
.mark { flex: 0 0 auto; font-weight: 700; }
.tname { color: var(--text); }
.terr { font-family: var(--font-mono); font-size: 0.78rem; width: 100%; padding-left: 1.4rem; }
</style>
