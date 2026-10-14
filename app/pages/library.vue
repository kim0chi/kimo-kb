<script setup lang="ts">
// The library shelf — every notebook (knowledge base) with its progress, plus
// placeholder cards for the roadmap tracks that don't have any content yet.
import { trackBuild } from '~~/lib/roadmap'

const { data } = await useFetch('/api/notebooks', { key: 'notebooks' })
const { data: roadmap } = await useFetch('/api/roadmap', { key: 'roadmap' })
const { states } = useReadingState()

const kindLabel: Record<string, string> = {
  handbook: 'Handbook',
  guide: 'Guide',
  project: 'Project',
  notes: 'Notes',
}

// Roadmap tracks that aren't fully built yet — surfaced so the shelf shows the whole
// plan, not just what exists. "planned" = nothing built; "partial" = some built. A
// complete track is carried by its notebook above, so it's left out here.
const pending = computed(() =>
  (roadmap.value?.tracks ?? [])
    .map((t) => ({ track: t, build: trackBuild(t) }))
    .filter(({ build }) => build.state !== 'complete')
    .map(({ track, build }) => ({
      id: track.id,
      title: track.title,
      description: track.description,
      ...build,
    })),
)

// Done count for a notebook = state entries under /<id>/ marked done.
function progress(id: string, total: number) {
  const done = Object.entries(states.value).filter(
    ([p, s]) => p.startsWith(`/${id}/`) && s === 'done',
  ).length
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}
</script>

<template>
  <div class="shelf">
    <h1>Library</h1>
    <p class="lede">Your knowledge bases. Pick one to read, reference, or take notes in.</p>

    <ul class="grid">
      <li v-for="nb in data?.notebooks" :key="nb.id">
        <NuxtLink :to="`/${nb.id}`" class="nb-card">
          <div class="nb-head">
            <h2>{{ nb.title }}</h2>
            <div class="nb-tags">
              <span v-if="nb.due" class="due-pill">{{ nb.due }} due</span>
              <span class="kind">{{ kindLabel[nb.kind] || nb.kind }}</span>
            </div>
          </div>
          <p v-if="nb.description" class="nb-desc">{{ nb.description }}</p>
          <div class="nb-foot">
            <div class="bar" role="progressbar" :aria-valuenow="progress(nb.id, nb.docCount || 0).pct" aria-valuemin="0" aria-valuemax="100">
              <div class="fill" :style="{ width: progress(nb.id, nb.docCount || 0).pct + '%' }" />
            </div>
            <span class="count">{{ progress(nb.id, nb.docCount || 0).done }} / {{ nb.docCount }} done</span>
          </div>
        </NuxtLink>
      </li>
    </ul>

    <p v-if="!data?.notebooks?.length && !pending.length" class="empty">
      No notebooks yet. Add one by dropping a folder with a <code>kb.json</code> (or a
      <code>*.kb.json</code> reference manifest) into your library directory.
    </p>

    <!-- Roadmap tracks not fully built yet: visible so the whole plan shows on the
         shelf. Each links to the learning path and becomes a real card once authored. -->
    <template v-if="pending.length">
      <div class="planned-head">
        <h2>In the works</h2>
        <span class="planned-sub">On the roadmap — not built yet</span>
      </div>
      <ul class="grid">
        <li v-for="t in pending" :key="t.id">
          <NuxtLink to="/learn" class="nb-card planned">
            <div class="nb-head">
              <h2>{{ t.title }}</h2>
              <span class="soon" :class="t.state">{{ t.state === 'partial' ? 'In progress' : 'Planned' }}</span>
            </div>
            <p v-if="t.description" class="nb-desc">{{ t.description }}</p>
            <div class="nb-foot">
              <template v-if="t.state === 'partial'">
                <div class="bar" role="progressbar" :aria-valuenow="Math.round((t.built / t.total) * 100)" aria-valuemin="0" aria-valuemax="100">
                  <div class="fill partial" :style="{ width: Math.round((t.built / t.total) * 100) + '%' }" />
                </div>
                <span class="count">{{ t.built }} / {{ t.total }} built · see the path →</span>
              </template>
              <span v-else class="count">{{ t.total }} topic{{ t.total === 1 ? '' : 's' }} outlined · see the path →</span>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
h1 { margin-bottom: 0.25rem; }
.lede { color: var(--muted); margin-top: 0; }
.grid { list-style: none; margin: 1.5rem 0 0; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr)); }
.nb-card {
  display: flex; flex-direction: column; height: 100%; gap: 0.5rem;
  background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
  padding: 1.1rem 1.2rem; color: var(--text); text-decoration: none; transition: border-color 0.15s;
}
.nb-card:hover { border-color: var(--accent); text-decoration: none; }
.nb-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
.nb-head h2 { margin: 0; font-size: 1.15rem; }
.nb-tags { display: flex; align-items: center; gap: 0.35rem; flex: 0 0 auto; }
.kind { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 0.05rem 0.5rem; flex: 0 0 auto; }
.due-pill { font-size: 0.66rem; font-weight: 700; color: var(--on-accent); background: var(--accent); border-radius: 999px; padding: 0.05rem 0.5rem; flex: 0 0 auto; }
.nb-desc { color: var(--muted); font-size: 0.9rem; margin: 0; flex: 1 1 auto; }
.nb-foot { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.3rem; }
.bar { flex: 1; height: 0.4rem; background: var(--panel-2); border: 1px solid var(--border); border-radius: 999px; padding: 1px; }
.fill { height: 100%; background: var(--good); border-radius: 999px; transition: width 0.25s ease; }
.count { font-size: 0.72rem; color: var(--muted); flex: 0 0 auto; }
.empty { color: var(--muted); margin-top: 1.5rem; }
.empty code { font-family: var(--font-mono); background: var(--panel-2); border: 1px solid var(--border); border-radius: 4px; padding: 0.05rem 0.3rem; font-size: 0.9em; }

/* Planned tracks — clearly not-yet-built: dashed, muted, no progress bar. */
.planned-head { display: flex; align-items: baseline; gap: 0.6rem; margin: 2.5rem 0 0; }
.planned-head h2 { margin: 0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
.planned-sub { font-size: 0.78rem; color: var(--faint); }
.nb-card.planned {
  background: transparent;
  border-style: dashed;
  color: var(--muted);
}
.nb-card.planned:hover { border-color: var(--accent); border-style: dashed; }
.nb-card.planned h2 { color: var(--muted); }
.soon {
  font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700;
  color: var(--faint); border: 1px solid var(--border); border-radius: 999px; padding: 0.05rem 0.5rem; flex: 0 0 auto;
}
.soon.partial { color: var(--accent); border-color: var(--accent); }
.fill.partial { background: var(--accent); }
</style>
