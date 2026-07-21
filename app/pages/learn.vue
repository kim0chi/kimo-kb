<script setup lang="ts">
// The learning path — tracks → modules → steps, layered over the notebooks.
// Step status is derived HERE from the reactive reading-state store, so marking a
// doc read updates the roadmap immediately (same source as every other progress UI).
import { stepStatus, entryPath, countSteps, pickNext } from '~~/lib/roadmap'

useHead({ title: 'Learn — the roadmap' })
const { data } = await useFetch('/api/roadmap', { key: 'roadmap' })
const { statusOf } = useReadingState()

const statusLabel: Record<string, string> = {
  done: 'Done',
  reading: 'In progress',
  todo: 'To do',
  planned: 'Planned',
}

const tracks = computed(() => data.value?.tracks ?? [])
const lookup = (p: string) => statusOf(p)

const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0)
const trackCounts = (t: (typeof tracks.value)[number]) =>
  countSteps(t.modules.flatMap((m) => m.steps), lookup)
const next = computed(() => pickNext(tracks.value, lookup))

// Open the first track initially; never fight the user's own collapse.
const openTrack = ref<string | null>(tracks.value[0]?.id ?? null)
watch(tracks, (list) => {
  const ids = list.map((t) => t.id)
  if (openTrack.value && !ids.includes(openTrack.value)) openTrack.value = ids[0] ?? null
})
</script>

<template>
  <div v-if="data?.roadmap">
    <nav class="crumb" aria-label="Breadcrumb">
      <NuxtLink to="/">Library</NuxtLink><span class="sep">›</span><span class="crumb-here">Learn</span>
    </nav>

    <h1>{{ data.roadmap.title }}</h1>
    <p v-if="data.roadmap.description" class="lede">{{ data.roadmap.description }}</p>

    <ul v-if="data.warnings?.length" class="warnings">
      <li v-for="w in data.warnings" :key="w">{{ w }}</li>
    </ul>

    <!-- Up next -->
    <section v-if="next" class="next">
      <span class="next-label">Up next</span>
      <div class="next-body">
        <strong>{{ next.step.title }}</strong>
        <span class="next-where">{{ next.trackTitle }} · {{ next.moduleTitle }}</span>
        <p v-if="next.step.objective" class="next-obj">{{ next.step.objective }}</p>
      </div>
      <NuxtLink v-if="next.entry" :to="next.entry" class="next-btn">Continue →</NuxtLink>
    </section>

    <!-- Tracks -->
    <ul class="tracks">
      <li v-for="t in tracks" :key="t.id" class="track">
        <button class="track-head" :aria-expanded="openTrack === t.id" @click="openTrack = openTrack === t.id ? null : t.id">
          <span class="caret" :class="{ open: openTrack === t.id }">▸</span>
          <span class="track-title">{{ t.title }}</span>
          <span class="track-meta">
            <span class="bar" role="progressbar" :aria-valuenow="pct(trackCounts(t).done, trackCounts(t).total)" aria-valuemin="0" aria-valuemax="100">
              <span class="fill" :style="{ width: pct(trackCounts(t).done, trackCounts(t).total) + '%' }" />
            </span>
            <span class="count">{{ trackCounts(t).done }}/{{ trackCounts(t).total }}</span>
          </span>
        </button>

        <div v-show="openTrack === t.id" class="track-body">
          <p v-if="t.description" class="track-desc">{{ t.description }}</p>
          <p v-if="trackCounts(t).ready === 0" class="backlog">
            No content written for this track yet — every step below is a placeholder to fill.
          </p>

          <div v-for="m in t.modules" :key="m.id" class="module">
            <div class="module-head">
              <h3>{{ m.title }}</h3>
              <span class="module-count">{{ countSteps(m.steps, lookup).done }}/{{ m.steps.length }}</span>
            </div>
            <ol class="steps">
              <li v-for="s in m.steps" :key="s.id" class="step" :class="stepStatus(s, lookup)">
                <span class="dot" />
                <div class="step-body">
                  <div class="step-title">
                    <NuxtLink v-if="entryPath(s)" :to="entryPath(s)!">{{ s.title }}</NuxtLink>
                    <span v-else>{{ s.title }}</span>
                    <span class="badge" :class="stepStatus(s, lookup)">{{ statusLabel[stepStatus(s, lookup)] }}</span>
                  </div>
                  <p v-if="s.objective" class="objective">{{ s.objective }}</p>
                  <div v-if="s.apply.some((a) => a.exists)" class="apply">
                    <span class="apply-label">Apply</span>
                    <template v-for="a in s.apply" :key="a.path">
                      <NuxtLink v-if="a.exists" :to="a.path" class="apply-link">{{ a.title }}</NuxtLink>
                    </template>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </li>
    </ul>
  </div>

  <!-- Broken manifest is reported, not silently treated as "no roadmap". -->
  <div v-else-if="data?.error" class="empty">
    <h1>Roadmap couldn't be read</h1>
    <p>Your <code>roadmap.yaml</code> exists but failed to parse:</p>
    <pre class="err">{{ data.error }}</pre>
    <p class="hint">Tip: quote any value containing a colon, e.g. <code>description: "Case study: the SI codebase"</code>.</p>
  </div>
  <div v-else class="empty">
    <h1>No roadmap yet</h1>
    <p>Add a <code>roadmap.yaml</code> to your library to define the learning path.</p>
  </div>
</template>

<style scoped>
.crumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--muted); margin-bottom: 1rem; }
.crumb a { color: var(--muted); }
.sep { opacity: 0.55; }
.crumb-here { color: var(--text); }
h1 { margin-bottom: 0.25rem; }
.lede { color: var(--muted); margin-top: 0; }

.warnings { list-style: none; margin: 1rem 0 0; padding: 0.6rem 0.9rem; border: 1px solid var(--serious); border-left-width: 3px; border-radius: 0 8px 8px 0; background: var(--panel); }
.warnings li { font-size: 0.84rem; color: var(--serious); }

.next {
  display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
  border: 1px solid var(--border); border-left: 3px solid var(--accent); border-radius: 0 10px 10px 0;
  background: var(--panel); padding: 0.9rem 1.1rem; margin: 1.5rem 0;
}
.next-label { font-size: 0.66rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); }
.next-body { flex: 1 1 16rem; }
.next-body strong { font-size: 1.02rem; }
.next-where { display: block; font-size: 0.74rem; color: var(--muted); margin-top: 0.1rem; }
.next-obj { margin: 0.35rem 0 0; font-size: 0.88rem; color: var(--muted); }
.next-btn { flex: 0 0 auto; background: var(--accent); color: var(--on-accent); border-radius: 8px; padding: 0.45rem 0.9rem; font-weight: 600; font-size: 0.88rem; }
.next-btn:hover { text-decoration: none; opacity: 0.92; }

.tracks { list-style: none; margin: 1.5rem 0 0; padding: 0; }
.track { border: 1px solid var(--border); border-radius: 10px; margin-bottom: 0.75rem; background: var(--panel); overflow: hidden; }
.track-head {
  width: 100%; display: flex; align-items: center; gap: 0.6rem; background: none; border: none;
  color: var(--text); cursor: pointer; padding: 0.85rem 1rem; text-align: left; font: inherit;
}
.track-head:hover { background: var(--bg); }
.caret { color: var(--muted); font-size: 0.72rem; transition: transform 0.15s; flex: 0 0 auto; }
.caret.open { transform: rotate(90deg); }
.track-title { font-family: var(--font-serif); font-weight: 600; font-size: 1.05rem; flex: 1 1 auto; }
.track-meta { display: flex; align-items: center; gap: 0.5rem; flex: 0 0 auto; }
.bar { display: block; width: 5rem; height: 0.35rem; background: var(--panel-2); border: 1px solid var(--border); border-radius: 999px; padding: 1px; }
.fill { display: block; height: 100%; background: var(--good); border-radius: 999px; }
.count { font-size: 0.72rem; color: var(--muted); }

.track-body { padding: 0 1rem 1rem; border-top: 1px solid var(--border); }
.track-desc { color: var(--muted); font-size: 0.9rem; margin: 0.8rem 0 0; }
.backlog { font-size: 0.82rem; color: var(--faint); font-style: italic; margin: 0.5rem 0 0; }
.module { margin-top: 1.1rem; }
.module-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
.module-head h3 { margin: 0; font-size: 0.94rem; }
.module-count { font-size: 0.72rem; color: var(--muted); }
.steps { list-style: none; margin: 0.4rem 0 0; padding: 0; }
.step { display: flex; gap: 0.6rem; padding: 0.4rem 0; }
.step .dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; margin-top: 0.42rem; flex: 0 0 auto; border: 1px solid var(--faint); }
.step.done .dot { background: var(--good); border-color: var(--good); }
.step.reading .dot { background: var(--accent); border-color: var(--accent); }
.step.planned .dot { border-style: dashed; opacity: 0.6; }
.step.planned .step-title { color: var(--faint); }
.step-body { flex: 1 1 auto; min-width: 0; }
.step-title { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.94rem; }
.badge { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.04em; padding: 0.02rem 0.4rem; border-radius: 4px; border: 1px solid var(--border); color: var(--muted); }
.badge.done { color: var(--good); border-color: var(--good); }
.badge.reading { color: var(--accent); border-color: var(--accent); }
.objective { margin: 0.15rem 0 0; font-size: 0.84rem; color: var(--muted); }
.apply { display: flex; align-items: baseline; gap: 0.4rem; margin-top: 0.2rem; flex-wrap: wrap; }
.apply-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--serious); border: 1px solid var(--serious); border-radius: 4px; padding: 0.02rem 0.35rem; }
.apply-link { font-size: 0.8rem; }
.empty code { font-family: var(--font-mono); background: var(--panel-2); border: 1px solid var(--border); border-radius: 4px; padding: 0.05rem 0.3rem; }
.err { background: var(--panel-2); border: 1px solid var(--critical); border-radius: 8px; padding: 0.7rem 0.9rem; overflow-x: auto; font-size: 0.85rem; color: var(--critical); }
.hint { color: var(--muted); font-size: 0.88rem; }
</style>
