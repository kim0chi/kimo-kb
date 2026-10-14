<script setup lang="ts">
import { ArrowUpRight, CircleCheck, RotateCcw } from '@lucide/vue'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import type { WorkItem, WorkKind, WorkStatus } from '~~/server/utils/work-items'

const props = defineProps<{ view: 'work' | 'ideas' | 'studio' }>()
const { data, status: loadStatus, error: loadError, refresh } = await useFetch<{ items: WorkItem[] }>('/api/work-items', { key: 'work-items' })
const filter = ref<WorkStatus | 'all'>('all')
const project = ref('')
const mutationError = ref('')
const changing = ref<string | null>(null)
const defaultKind = computed<WorkKind>(() => props.view === 'ideas' ? 'idea' : props.view === 'studio' ? 'design' : 'task')
const title = computed(() => props.view === 'ideas' ? 'Idea inbox' : props.view === 'studio' ? 'Design practice' : 'Work queue')
const description = computed(() => props.view === 'ideas'
  ? 'A place to think without turning every thought into a deadline.'
  : props.view === 'studio'
    ? 'Practice visual decisions, record what you notice, and keep the rationale.'
    : 'Track your own next actions. Source systems keep their own status.')
const baseItems = computed(() => (data.value?.items ?? []).filter((item) => {
  if (props.view === 'ideas') return item.kind === 'idea'
  if (props.view === 'studio') return item.kind === 'design'
  return item.kind !== 'idea'
}))
const projects = computed(() => [...new Set(baseItems.value.map((item) => item.project).filter(Boolean))].sort())
const projectPulse = computed(() => projects.value.map((name) => {
  const items = baseItems.value.filter((item) => item.project === name)
  return {
    name,
    active: items.filter((item) => item.status === 'active').length,
    waiting: items.filter((item) => item.status === 'waiting').length,
    queued: items.filter((item) => item.status === 'queued').length,
  }
}))
const visibleItems = computed(() => baseItems.value.filter((item) =>
  (filter.value === 'all' ? item.status !== 'archived' : item.status === filter.value) &&
  (!project.value || item.project === project.value),
))
const tabs: { key: WorkStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Open & recent' }, { key: 'queued', label: 'Queued' },
  { key: 'active', label: 'Active' }, { key: 'waiting', label: 'Waiting' },
  { key: 'done', label: 'Done' }, { key: 'archived', label: 'Archived' },
]
const viewTabs = computed(() => props.view === 'ideas' ? tabs.filter((tab) => ['all', 'queued', 'archived'].includes(tab.key)) : tabs)

async function change(item: WorkItem, next: WorkStatus, promote = false) {
  changing.value = item.id
  mutationError.value = ''
  try {
    await $fetch('/api/work-items/' + item.id, { method: 'PATCH', body: promote ? { kind: 'task', status: next } : { status: next } })
    await refresh()
  } catch (cause) {
    const failure = cause as { data?: { statusMessage?: string }; message?: string }
    mutationError.value = failure.data?.statusMessage || failure.message || 'Could not update this item.'
  } finally {
    changing.value = null
  }
}
</script>

<template>
  <div class="work-page">
    <div class="page-heading">
      <div>
        <div class="eyebrow">{{ view === 'studio' ? 'ATELIER' : view === 'ideas' ? 'CAPTURE' : 'PERSONAL QUEUE' }}</div>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <WorkComposer :kind="defaultKind" @saved="refresh()" />
    </div>
    <div v-if="view === 'work'" class="context-strip">
      <NuxtLink to="/ideas">Ideas belong in the inbox <ArrowUpRight :size="14" aria-hidden="true" /></NuxtLink>
      <NuxtLink to="/studio">Design practice has its own space <ArrowUpRight :size="14" aria-hidden="true" /></NuxtLink>
    </div>
    <div v-if="view === 'studio'" class="studio-prompt">
      <span class="eyebrow">PRACTICE LOOP</span>
      <p>Choose a reference → name one design decision → recreate it → write what changed.</p>
    </div>
    <section v-if="view === 'work' && projectPulse.length" class="project-pulse" aria-label="Personal project status">
      <button v-for="pulse in projectPulse" :key="pulse.name" type="button" class="project-card" :aria-pressed="project === pulse.name" @click="project = project === pulse.name ? '' : pulse.name">
        <strong>{{ pulse.name }}</strong>
        <span>{{ pulse.active }} active <span aria-hidden="true">·</span> {{ pulse.queued }} queued <span aria-hidden="true">·</span> {{ pulse.waiting }} waiting</span>
      </button>
    </section>
    <div class="filters">
      <div class="status-tabs" role="group" aria-label="Filter by status">
        <button v-for="tab in viewTabs" :key="tab.key" type="button" :class="{ selected: filter === tab.key }" :aria-pressed="filter === tab.key" @click="filter = tab.key">{{ tab.label }}</button>
      </div>
      <label v-if="projects.length" class="project-filter">Project
        <select v-model="project">
          <option value="">All projects</option>
          <option v-for="name in projects" :key="name" :value="name">{{ name }}</option>
        </select>
      </label>
    </div>
    <p v-if="mutationError" class="error" role="alert">{{ mutationError }}</p>
    <p v-if="loadStatus === 'pending'" class="list-state">Loading your items…</p>
    <div v-else-if="loadError" class="list-state error" role="alert">Could not load your items. <Button variant="outline" size="sm" @click="refresh()">Retry</Button></div>
    <div v-else-if="!visibleItems.length" class="empty-state">
      <div class="empty-mark">{{ view === 'ideas' ? '✦' : view === 'studio' ? '◇' : '○' }}</div>
      <h2>{{ baseItems.length ? 'No items match these filters' : view === 'ideas' ? 'A quiet inbox' : view === 'studio' ? 'Start with one reference' : 'Your queue is clear' }}</h2>
      <p>{{ baseItems.length ? 'Try another status or project.' : view === 'ideas' ? 'Capture a thought here. Decide what to do with it later.' : view === 'studio' ? 'Choose a layout or interaction you admire and record what makes it work.' : 'Add one next action so you know where to begin.' }}</p>
    </div>
    <ul v-else class="item-list">
      <li v-for="item in visibleItems" :key="item.id" class="item-card">
        <div class="item-main">
          <div class="item-meta">
            <Badge variant="outline">{{ item.kind === 'design' ? 'Design' : item.kind === 'idea' ? 'Idea' : 'Task' }}</Badge>
            <span class="status" :class="item.status">{{ item.status }}</span>
            <span v-if="item.project" class="project-name">{{ item.project }}</span>
          </div>
          <h2>{{ item.title }}</h2>
          <p v-if="item.note" class="note-preview">{{ item.note }}</p>
          <a v-if="item.sourceUrl" :href="item.sourceUrl" target="_blank" rel="noopener noreferrer" class="source-link">Open source <ArrowUpRight :size="14" aria-hidden="true" /></a>
        </div>
        <div class="item-actions">
          <Button v-if="item.kind === 'idea' && item.status !== 'archived'" variant="outline" size="sm" :disabled="changing === item.id" @click="change(item, 'queued', true)">Promote to task</Button>
          <Button v-else-if="item.kind !== 'idea' && item.status !== 'done' && item.status !== 'archived'" variant="outline" size="sm" :disabled="changing === item.id" @click="change(item, 'done')"><CircleCheck :size="14" aria-hidden="true" /> Done</Button>
          <Button v-else-if="item.status === 'done' || item.status === 'archived'" variant="outline" size="sm" :disabled="changing === item.id" @click="change(item, 'queued')"><RotateCcw :size="14" aria-hidden="true" /> Reopen</Button>
          <WorkComposer :item="item" @saved="refresh()" />
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.work-page { max-width: 72rem; }
.page-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 1.25rem; margin-bottom: 2rem; }
.eyebrow { color: var(--accent); letter-spacing: .13em; font-size: .7rem; font-weight: 800; }
h1 { margin: .15rem 0 .25rem; font-size: clamp(2rem, 4vw, 3.2rem); letter-spacing: -.035em; line-height: 1.13; }
.page-heading p { max-width: 38rem; color: var(--muted); margin: .4rem 0 0; }
.context-strip { display: flex; flex-wrap: wrap; gap: .6rem 1.5rem; margin: -1rem 0 1.8rem; font-size: .84rem; }
.context-strip a, .source-link { display: inline-flex; gap: .3rem; align-items: center; }
.studio-prompt { padding: 1.2rem 1.4rem; margin-bottom: 1.5rem; border: 1px solid var(--border); border-left: 3px solid var(--accent); border-radius: .7rem; background: var(--panel); }
.studio-prompt p { margin: .3rem 0 0; font-family: var(--font-serif); font-size: 1.05rem; }
.project-pulse { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: .6rem; margin: 0 0 1.5rem; }
.project-card { display: flex; flex-direction: column; gap: .25rem; text-align: left; border: 1px solid var(--border); border-radius: .65rem; padding: .85rem 1rem; background: var(--panel); color: var(--text); cursor: pointer; }
.project-card:hover, .project-card[aria-pressed='true'] { border-color: var(--accent); }
.project-card strong { font-size: .88rem; }.project-card span { color: var(--muted); font-size: .73rem; }
.filters { display: flex; flex-wrap: wrap; gap: .75rem; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.status-tabs { display: flex; gap: .25rem; max-width: 100%; overflow-x: auto; padding-bottom: .2rem; }
.status-tabs button { flex: 0 0 auto; padding: .35rem .65rem; border: 0; border-radius: .5rem; background: transparent; color: var(--muted); font: inherit; font-size: .8rem; cursor: pointer; }
.status-tabs button.selected { background: var(--accent-soft); color: var(--accent); font-weight: 700; }
.project-filter { display: flex; align-items: center; gap: .45rem; color: var(--muted); font-size: .78rem; }
.project-filter select { border: 1px solid var(--border); border-radius: .5rem; background: var(--panel); color: var(--text); padding: .35rem .5rem; }
.list-state, .empty-state { border: 1px dashed var(--border); border-radius: .9rem; background: var(--panel); padding: 2.5rem 1.5rem; color: var(--muted); }
.empty-state { text-align: center; }
.empty-mark { font-size: 2rem; color: var(--accent); line-height: 1; }
.empty-state h2 { font-family: var(--font-serif); color: var(--text); margin: .6rem 0 .2rem; }
.empty-state p { margin: 0; }
.item-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .75rem; }
.item-card { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; padding: 1.1rem 1.25rem; border: 1px solid var(--border); border-radius: .8rem; background: var(--panel); }
.item-main { min-width: 0; }
.item-meta { display: flex; align-items: center; flex-wrap: wrap; gap: .55rem; color: var(--muted); font-size: .73rem; text-transform: capitalize; }
.status { font-weight: 700; }
.status.active { color: var(--accent); }.status.done { color: var(--good); }.status.waiting { color: var(--serious); }
.project-name::before { content: '· '; }
.item-card h2 { margin: .45rem 0 .1rem; font-family: var(--font-ui); font-size: 1rem; line-height: 1.35; }
.note-preview { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-line; margin: .25rem 0; color: var(--muted); font-size: .85rem; }
.source-link { font-size: .78rem; margin-top: .35rem; }
.item-actions { display: flex; flex: 0 0 auto; flex-wrap: wrap; gap: .4rem; align-items: center; }
.error { color: var(--critical); }
@media (max-width: 42rem) { .item-card { flex-direction: column; }.item-actions { width: 100%; }.page-heading { align-items: flex-start; } }
</style>
