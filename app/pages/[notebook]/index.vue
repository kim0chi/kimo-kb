<script setup lang="ts">
// A notebook's home. reading-order notebooks show chapters + notes/decisions;
// tree/flat notebooks show generic sections with tag + difficulty filtering.
const route = useRoute()
const notebook = computed(() => route.params.notebook as string)

const { data } = await useFetch(() => `/api/nav?notebook=${notebook.value}`, {
  key: () => `nav:${notebook.value}`,
})
const { statusOf, progressOf } = useReadingState()

const isReadingOrder = computed(() => data.value?.strategy === 'reading-order')

const overallPaths = computed(() =>
  isReadingOrder.value
    ? (data.value?.chapters ?? []).flatMap((c) => c.docs.map((d) => d.path))
    : (data.value?.sections ?? []).flatMap((s) => s.docs.map((d) => d.path)),
)
const overall = computed(() => progressOf(overallPaths.value))
const pct = computed(() => (overall.value.total ? Math.round((overall.value.done / overall.value.total) * 100) : 0))
const pctOf = (paths: (string | null | undefined)[]) => {
  const p = progressOf(paths)
  return p.total ? Math.round((p.done / p.total) * 100) : 0
}

const extraGroups = computed(() => [
  { key: 'notes', label: 'Working notes', items: data.value?.notes ?? [] },
  { key: 'decisions', label: 'Decisions', items: data.value?.decisions ?? [] },
])

// Tag filter for tree/flat notebooks.
const tag = ref<string | null>(null)
const filteredSections = computed(() =>
  (data.value?.sections ?? [])
    .map((s) => ({ ...s, docs: tag.value ? s.docs.filter((d) => d.tags?.includes(tag.value!)) : s.docs }))
    .filter((s) => s.docs.length),
)
</script>

<template>
  <div v-if="data?.notebook">
    <nav class="crumb" aria-label="Breadcrumb">
      <NuxtLink to="/">Library</NuxtLink>
      <span class="sep">›</span>
      <span class="crumb-here">{{ data.notebook.title }}</span>
    </nav>

    <h1>{{ data.notebook.title }}</h1>
    <p v-if="isReadingOrder && data.chapters.length" class="lede">
      One reading path through everything, in chapters. Read one at a time, in order.
    </p>

    <div v-if="overall.total" class="overall">
      <div class="bar" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100" aria-label="Reading progress">
        <div class="fill" :style="{ width: pct + '%', minWidth: pct > 0 ? '0.5rem' : '0' }" />
      </div>
      <span class="overall-label">{{ overall.done }} / {{ overall.total }} read ({{ pct }}%)</span>
    </div>

    <!-- reading-order: chapters + notes/decisions -->
    <template v-if="isReadingOrder">
      <ol class="path">
        <li v-for="ch in data.chapters" :key="ch.number" class="card">
          <div class="card-head">
            <h2>Chapter {{ ch.number }} — {{ ch.title }}</h2>
            <span class="ch-progress">{{ progressOf(ch.docs.map((d) => d.path)).done }}/{{ progressOf(ch.docs.map((d) => d.path)).total }}</span>
          </div>
          <div class="ch-bar" role="progressbar" :aria-valuenow="pctOf(ch.docs.map((d) => d.path))" aria-valuemin="0" aria-valuemax="100">
            <div class="ch-fill" :style="{ width: pctOf(ch.docs.map((d) => d.path)) + '%' }" />
          </div>
          <p v-if="ch.blurb" class="blurb">{{ ch.blurb }}</p>
          <p v-if="ch.doneWhen" class="done-when"><strong>You're done when:</strong> {{ ch.doneWhen }}</p>
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
        <h2 v-if="grp.items.length" class="extra-title">{{ grp.label }}</h2>
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
    </template>

    <!-- tree/flat: generic sections + tag filter -->
    <template v-else>
      <div v-if="data.tags?.length" class="filters">
        <button class="chip" :class="{ on: !tag }" @click="tag = null">All</button>
        <button v-for="t in data.tags" :key="t" class="chip" :class="{ on: tag === t }" @click="tag = tag === t ? null : t">#{{ t }}</button>
      </div>

      <section v-for="s in filteredSections" :key="s.id" class="card">
        <div class="card-head">
          <h2>{{ s.title }}</h2>
          <span class="ch-progress">{{ progressOf(s.docs.map((d) => d.path)).done }}/{{ s.docs.length }}</span>
        </div>
        <ul class="docs">
          <li v-for="d in s.docs" :key="d.path" class="doc-row">
            <StatusDot :status="statusOf(d.path)" />
            <NuxtLink :to="d.path" class="doc-link">{{ d.title }}</NuxtLink>
            <span v-if="d.difficulty" class="diff" :class="d.difficulty.toLowerCase()">{{ d.difficulty }}</span>
            <span v-for="t in d.tags" :key="t" class="tag-chip" @click.prevent="tag = t">#{{ t }}</span>
          </li>
        </ul>
      </section>
      <p v-if="!filteredSections.length" class="missing">No docs{{ tag ? ` tagged #${tag}` : '' }} yet.</p>
    </template>
  </div>
  <div v-else class="notfound">
    <h1>Notebook not found</h1>
    <p>No notebook “{{ notebook }}” in the library. <NuxtLink to="/">Back to the library →</NuxtLink></p>
  </div>
</template>

<style scoped>
.crumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--muted); margin-bottom: 1rem; }
.crumb a { color: var(--muted); }
.crumb a:hover { color: var(--accent); }
.sep { opacity: 0.55; }
.crumb-here { color: var(--text); }
h1 { margin-bottom: 0.25rem; }
.lede { color: var(--muted); margin-top: 0; }
.overall { display: flex; align-items: center; gap: 0.75rem; margin: 1.25rem 0 1.75rem; }
.bar { flex: 1; height: 0.5rem; background: var(--panel-2); border: 1px solid var(--border); border-radius: 999px; padding: 1px; }
.fill { height: 100%; background: var(--good); border-radius: 999px; transition: width 0.25s ease; }
.overall-label { font-size: 0.85rem; color: var(--muted); flex: 0 0 auto; }

.filters { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 1.25rem 0; }
.chip { background: var(--panel); color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 0.2rem 0.65rem; font-size: 0.8rem; cursor: pointer; }
.chip.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }

.path { list-style: none; margin: 1.5rem 0 0; padding: 0; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 1rem 1.15rem; margin-bottom: 1rem; }
.card-head { display: flex; gap: 0.5rem; align-items: baseline; justify-content: space-between; }
.card-head h2 { font-size: 1.05rem; margin: 0; }
.ch-progress { font-size: 0.8rem; color: var(--muted); flex: 0 0 auto; }
.ch-bar { height: 3px; background: var(--panel-2); border-radius: 999px; margin: 0.5rem 0 0; overflow: hidden; }
.ch-fill { height: 100%; background: var(--good); border-radius: 999px; transition: width 0.25s ease; }
.blurb { color: var(--muted); font-size: 0.95rem; margin: 0.5rem 0; }
.done-when { font-size: 0.9rem; margin: 0.5rem 0; }
.done-when strong { color: var(--accent); }
.docs { list-style: none; margin: 0.5rem 0 0; padding: 0; }
.docs li { display: flex; align-items: center; gap: 0.5rem; margin: 0.2rem 0; }
.doc-row { flex-wrap: wrap; }
.doc-link { flex: 0 1 auto; }
.diff { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.03em; padding: 0.03rem 0.4rem; border-radius: 4px; border: 1px solid var(--border); color: var(--muted); flex: 0 0 auto; }
.diff.easy { color: var(--good); border-color: var(--good); }
.diff.medium { color: var(--serious); border-color: var(--serious); }
.diff.hard { color: var(--critical); border-color: var(--critical); }
.tag-chip { font-size: 0.66rem; color: var(--muted); cursor: pointer; }
.tag-chip:hover { color: var(--accent); }
.missing { color: var(--faint); font-style: italic; }
.extra { margin-top: 2rem; }
.extra-title { font-size: 1.05rem; margin: 0 0 0.6rem; }
.extra-list { list-style: none; margin: 0; padding: 0; }
.extra-list li { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.extra-link { flex: 1 1 auto; min-width: 12rem; }
.ticket { font-size: 0.68rem; color: var(--muted); font-family: var(--font-mono); flex: 0 0 auto; }
.date { font-size: 0.72rem; color: var(--muted); flex: 0 0 auto; }
.st-badge { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.03em; padding: 0.03rem 0.4rem; border-radius: 4px; border: 1px solid var(--border); color: var(--muted); flex: 0 0 auto; }
.st-badge.fixed, .st-badge.committed { color: var(--good); border-color: var(--good); }
.st-badge.planning, .st-badge.investigating { color: var(--serious); border-color: var(--serious); }
.notfound { padding-top: 2rem; }
</style>
