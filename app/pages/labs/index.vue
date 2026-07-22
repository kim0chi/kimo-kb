<script setup lang="ts">
// Code Lab — labs are folders you drop into <library>/labs/.
import { getRunner } from '~~/lib/runners'

useHead({ title: 'Code Lab' })
const { data } = await useFetch('/api/labs', { key: 'labs' })
const labs = computed(() => data.value?.labs ?? [])
</script>

<template>
  <div>
    <nav class="crumb" aria-label="Breadcrumb">
      <NuxtLink to="/">Library</NuxtLink><span class="sep">›</span><span class="crumb-here">Code Lab</span>
    </nav>

    <h1>Code Lab</h1>
    <p class="lede">Apply the concepts in code. Write your solution in your editor; run it here.</p>

    <ul v-if="labs.length" class="grid">
      <li v-for="l in labs" :key="l.id">
        <NuxtLink :to="`/labs/${l.id}`" class="lab-card">
          <div class="lab-head">
            <h2>{{ l.title }}</h2>
            <span class="lang">{{ getRunner(l.lang)?.label || l.lang }}</span>
          </div>
          <div class="lab-meta">
            <span v-if="l.difficulty" class="diff" :class="l.difficulty.toLowerCase()">{{ l.difficulty }}</span>
            <span v-for="t in l.tags" :key="t" class="tag">#{{ t }}</span>
          </div>
          <div class="lab-foot">
            <span v-if="l.missingSolution" class="todo">no solution yet</span>
            <span v-else class="lines">{{ l.solutionLines }} lines</span>
            <span v-if="l.hasTests" class="tests">has tests</span>
            <span v-if="!getRunner(l.lang)?.available" class="soon">no runner</span>
          </div>
        </NuxtLink>
      </li>
    </ul>

    <div v-else class="empty">
      <h2>No labs yet</h2>
      <p>Create a folder in <code>{{ data?.dir }}</code> — the app picks it up on restart:</p>
      <pre><code>labs/two-sum/
  lab.md        # ---\ntitle: Two Sum\nlang: js\ndifficulty: easy\n---  + the prompt
  solution.js   # your code
  tests.js      # optional: test('…', () =&gt; assertEqual(twoSum([1,2]), …))</code></pre>
    </div>
  </div>
</template>

<style scoped>
.crumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--muted); margin-bottom: 1rem; }
.crumb a { color: var(--muted); }
.sep { opacity: 0.55; }
.crumb-here { color: var(--text); }
h1 { margin-bottom: 0.25rem; }
.lede { color: var(--muted); margin-top: 0; }
.grid { list-style: none; margin: 1.5rem 0 0; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); }
.lab-card {
  display: flex; flex-direction: column; gap: 0.45rem; height: 100%;
  background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
  padding: 1rem 1.15rem; color: var(--text); text-decoration: none;
}
.lab-card:hover { border-color: var(--accent); text-decoration: none; }
.lab-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
.lab-head h2 { margin: 0; font-size: 1.05rem; }
.lang { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 0.05rem 0.5rem; flex: 0 0 auto; }
.lab-meta { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
.diff { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.03em; padding: 0.03rem 0.4rem; border-radius: 4px; border: 1px solid var(--border); color: var(--muted); }
.diff.easy { color: var(--good); border-color: var(--good); }
.diff.medium { color: var(--serious); border-color: var(--serious); }
.diff.hard { color: var(--critical); border-color: var(--critical); }
.tag { font-size: 0.66rem; color: var(--muted); }
.lab-foot { display: flex; flex-wrap: wrap; gap: 0.6rem; font-size: 0.72rem; color: var(--muted); margin-top: auto; }
.todo { color: var(--serious); }
.soon { color: var(--faint); font-style: italic; }
.empty { margin-top: 2rem; }
.empty code { font-family: var(--font-mono); }
.empty pre { background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 0.9rem 1rem; overflow-x: auto; font-size: 0.8rem; }
</style>
