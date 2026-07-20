<script setup lang="ts">
// The reading path — chapter overview, the app's home.
const { data } = await useFetch('/api/nav')
const { statusOf, progressOf } = useReadingState()

// Overall progress across every doc in the reading path.
const overall = computed(() =>
  progressOf((data.value?.chapters ?? []).flatMap((c) => c.docs.map((d) => d.path))),
)
const pct = computed(() => (overall.value.total ? Math.round((overall.value.done / overall.value.total) * 100) : 0))

const extraGroups = computed(() => [
  { key: 'notes', label: 'Working notes', items: data.value?.notes ?? [] },
  { key: 'decisions', label: 'Decisions', items: data.value?.decisions ?? [] },
])
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

    <section v-for="grp in extraGroups" :key="grp.key" class="extra">
      <h2 class="extra-title">{{ grp.label }}</h2>
      <ul class="extra-list">
        <li v-for="d in grp.items" :key="d.path">
          <StatusDot :status="statusOf(d.path)" />
          <NuxtLink :to="d.path" class="extra-link">{{ d.title }}</NuxtLink>
          <span v-if="d.ticket" class="ticket">{{ d.ticket }}</span>
          <span v-if="d.status" class="st-badge" :class="d.status">{{ d.status }}</span>
          <span v-if="d.date" class="date">{{ d.date }}</span>
        </li>
      </ul>
    </section>
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

.extra { margin-top: 2rem; }
.extra-title { font-size: 1.05rem; margin: 0 0 0.6rem; }
.extra-list { list-style: none; margin: 0; padding: 0; }
.extra-list li { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.extra-link { flex: 1 1 auto; min-width: 12rem; }
.ticket { font-size: 0.68rem; color: var(--muted); font-family: ui-monospace, monospace; flex: 0 0 auto; }
.date { font-size: 0.72rem; color: var(--muted); flex: 0 0 auto; }
.st-badge { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.03em; padding: 0.03rem 0.4rem; border-radius: 4px; border: 1px solid var(--border); color: var(--muted); flex: 0 0 auto; }
.st-badge.fixed, .st-badge.committed { color: var(--done); border-color: var(--done); }
.st-badge.planning, .st-badge.investigating { color: #f0a35e; border-color: #f0a35e; }
</style>
