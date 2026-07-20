<script setup lang="ts">
// The reading path — chapter overview, the app's home.
const { data } = await useFetch('/api/nav')
const { statusOf, progressOf } = useReadingState()

// Overall progress across every doc in the reading path.
const overall = computed(() =>
  progressOf((data.value?.chapters ?? []).flatMap((c) => c.docs.map((d) => d.path))),
)
const pct = computed(() => (overall.value.total ? Math.round((overall.value.done / overall.value.total) * 100) : 0))
</script>

<template>
  <div>
    <h1>The SI Handbook</h1>
    <p class="lede">
      One reading path through everything, in chapters. Read one at a time, in order.
    </p>

    <div class="overall">
      <div class="bar"><div class="fill" :style="{ width: pct + '%' }" /></div>
      <span class="overall-label">{{ overall.done }} / {{ overall.total }} read ({{ pct }}%)</span>
    </div>

    <ol class="path">
      <li v-for="ch in data?.chapters" :key="ch.number" class="card">
        <div class="card-head">
          <h2>Chapter {{ ch.number }} — {{ ch.title }}</h2>
          <span class="ch-progress">
            {{ progressOf(ch.docs.map((d) => d.path)).done }}/{{
              progressOf(ch.docs.map((d) => d.path)).total
            }}
          </span>
        </div>
        <p v-if="ch.blurb" class="blurb">{{ ch.blurb }}</p>
        <p v-if="ch.doneWhen" class="done-when">
          <strong>You're done when:</strong> {{ ch.doneWhen }}
        </p>
        <ul class="docs">
          <li v-for="doc in ch.docs" :key="doc.target">
            <template v-if="doc.path">
              <StatusDot :status="statusOf(doc.path)" />
              <NuxtLink :to="doc.path">{{ doc.title || doc.alias }}</NuxtLink>
            </template>
            <span v-else class="missing">{{ doc.alias }} (unresolved)</span>
          </li>
        </ul>
      </li>
    </ol>
  </div>
</template>

<style scoped>
h1 { margin-bottom: 0.25rem; }
.lede { color: var(--muted); margin-top: 0; }
.overall { display: flex; align-items: center; gap: 0.75rem; margin: 1.25rem 0 1.75rem; }
.bar { flex: 1; height: 0.5rem; background: var(--panel); border: 1px solid var(--border); border-radius: 999px; overflow: hidden; }
.fill { height: 100%; background: var(--done); transition: width 0.25s ease; }
.overall-label { font-size: 0.85rem; color: var(--muted); flex: 0 0 auto; }
.path { list-style: none; margin: 1.5rem 0 0; padding: 0; }
.card {
  background: var(--panel); border: 1px solid var(--border);
  border-radius: 10px; padding: 1rem 1.15rem; margin-bottom: 1rem;
}
.card-head { display: flex; gap: 0.5rem; align-items: baseline; justify-content: space-between; }
.card-head h2 { font-size: 1.05rem; margin: 0; }
.ch-progress { font-size: 0.8rem; color: var(--muted); flex: 0 0 auto; }
.blurb { color: var(--muted); font-size: 0.95rem; margin: 0.5rem 0; }
.done-when { font-size: 0.9rem; margin: 0.5rem 0; }
.done-when strong { color: var(--accent); }
.docs { list-style: none; margin: 0.5rem 0 0; padding: 0; }
.docs li { display: flex; align-items: center; gap: 0.5rem; margin: 0.2rem 0; }
.missing { color: #6b7280; font-style: italic; }
</style>
