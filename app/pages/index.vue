<script setup lang="ts">
import { ArrowRight, BookOpen, CircleHelp, ListTodo, Sparkles } from '@lucide/vue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { pickNext, type RoadmapTrack } from '~~/lib/roadmap'
import type { WorkItem } from '~~/server/utils/work-items'

useHead({ title: 'Today — Kimo' })
const { data: notebooks, status: notebookStatus, error: notebookError } = await useFetch<{ notebooks: { id: string; title: string; due: number; exercisesDue: number; docCount: number }[] }>('/api/notebooks', { key: 'notebooks' })
const { data: roadmap, status: roadmapStatus, error: roadmapError } = await useFetch<{ tracks: RoadmapTrack[]; error?: string }>('/api/roadmap', { key: 'roadmap' })
const { data: work, status: workStatus, error: workError, refresh: refreshWork } = await useFetch<{ items: WorkItem[] }>('/api/work-items', { key: 'work-items' })
const { states, statusOf } = useReadingState()
const dateLabel = new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
const next = computed(() => pickNext(roadmap.value?.tracks ?? [], statusOf))
const active = computed(() => (work.value?.items ?? []).filter((item) => item.status === 'active' && item.kind !== 'idea').slice(0, 3))
const queued = computed(() => (work.value?.items ?? []).filter((item) => item.status === 'queued' && item.kind !== 'idea').slice(0, 3))
const ideaCount = computed(() => (work.value?.items ?? []).filter((item) => item.kind === 'idea' && item.status !== 'archived').length)
const dueCards = computed(() => (notebooks.value?.notebooks ?? []).reduce((sum, notebook) => sum + (notebook.due || 0), 0))
const dueExercises = computed(() => (notebooks.value?.notebooks ?? []).reduce((sum, notebook) => sum + (notebook.exercisesDue || 0), 0))
const reviewNotebook = computed(() => (notebooks.value?.notebooks ?? []).find((notebook) => notebook.due || notebook.exercisesDue))
const readingCount = computed(() => Object.values(states.value).filter((state) => state === 'reading').length)
</script>

<template>
  <div class="today-page">
    <div class="today-top">
      <div>
        <p class="eyebrow">{{ dateLabel }} · YOUR WORKSPACE</p>
        <h1>One place to pick up the thread.</h1>
        <p class="lede">See the work, understand what you build, and leave a trail you can return to.</p>
      </div>
      <WorkComposer kind="idea" label="Capture a thought" @saved="refreshWork()" />
    </div>

    <div class="today-grid">
      <section class="learning-column" aria-labelledby="learning-title">
        <div class="section-title"><span class="section-icon"><BookOpen :size="17" aria-hidden="true" /></span><h2 id="learning-title">Keep learning</h2></div>
        <Card class="focus-card">
          <div class="card-kicker">NEXT IN YOUR PATH</div>
          <template v-if="roadmapStatus === 'pending'"><p class="muted">Finding your next step…</p></template>
          <template v-else-if="roadmapError || roadmap?.error"><p class="error">Your roadmap could not be read. <NuxtLink to="/learn">View the issue</NuxtLink></p></template>
          <template v-else-if="next">
            <Badge variant="outline" class="track-label">{{ next.trackTitle }}</Badge>
            <h3>{{ next.step.title }}</h3>
            <p class="muted">{{ next.step.objective || 'Read the source, then explain it in your own words.' }}</p>
            <div class="focus-footer">
              <span>{{ next.moduleTitle }}</span>
              <NuxtLink v-if="next.entry" :to="next.entry" class="primary-link">Continue learning <ArrowRight :size="16" aria-hidden="true" /></NuxtLink>
              <NuxtLink v-else to="/learn" class="primary-link">View learning path <ArrowRight :size="16" aria-hidden="true" /></NuxtLink>
            </div>
          </template>
          <template v-else><h3>Start with a learning path</h3><p class="muted">Browse the available topics and choose one that supports your work.</p><NuxtLink to="/learn" class="primary-link">Explore learning path <ArrowRight :size="16" aria-hidden="true" /></NuxtLink></template>
        </Card>
        <div class="learning-row">
          <Card class="mini-card">
            <div class="mini-label"><Sparkles :size="16" aria-hidden="true" /> RECALL</div>
            <strong>{{ dueCards + dueExercises }}</strong>
            <span class="muted">reviews due</span>
            <NuxtLink v-if="reviewNotebook" :to="reviewNotebook.due ? '/' + reviewNotebook.id + '/review' : '/' + reviewNotebook.id + '/exercises'">Practice now <ArrowRight :size="14" aria-hidden="true" /></NuxtLink>
            <NuxtLink v-else to="/library">Browse notebooks <ArrowRight :size="14" aria-hidden="true" /></NuxtLink>
          </Card>
          <Card class="mini-card">
            <div class="mini-label"><BookOpen :size="16" aria-hidden="true" /> READING</div>
            <strong>{{ readingCount }}</strong>
            <span class="muted">documents in progress</span>
            <NuxtLink to="/library">Open library <ArrowRight :size="14" aria-hidden="true" /></NuxtLink>
          </Card>
        </div>
        <div class="journal-actions"><LearningCapture /><NuxtLink to="/journal">See your learning history <ArrowRight :size="14" aria-hidden="true" /></NuxtLink></div>
        <p v-if="notebookStatus === 'pending'" class="muted small">Loading review and reading totals…</p>
        <p v-else-if="notebookError" class="error small">Review totals are unavailable right now.</p>
      </section>

      <section class="work-column" aria-labelledby="work-title">
        <div class="section-title"><span class="section-icon"><ListTodo :size="17" aria-hidden="true" /></span><h2 id="work-title">In motion</h2><NuxtLink to="/work" class="section-link">Full queue <ArrowRight :size="14" aria-hidden="true" /></NuxtLink></div>
        <Card class="work-card">
          <div class="card-kicker">YOUR WORK</div>
          <p v-if="workStatus === 'pending'" class="muted">Loading your queue…</p>
          <p v-else-if="workError" class="error">Your queue could not be loaded. <button type="button" @click="refreshWork()">Retry</button></p>
          <template v-else-if="active.length || queued.length">
            <div v-if="active.length" class="work-group"><span class="group-label">ACTIVE</span><NuxtLink v-for="item in active" :key="item.id" to="/work" class="work-item"><span class="work-dot active" /><span><strong>{{ item.title }}</strong><small v-if="item.project">{{ item.project }}</small></span><ArrowRight :size="15" aria-hidden="true" /></NuxtLink></div>
            <div v-if="queued.length" class="work-group"><span class="group-label">UP NEXT</span><NuxtLink v-for="item in queued" :key="item.id" to="/work" class="work-item"><span class="work-dot" /><span><strong>{{ item.title }}</strong><small v-if="item.project">{{ item.project }}</small></span><ArrowRight :size="15" aria-hidden="true" /></NuxtLink></div>
          </template>
          <template v-else><h3>Your queue is clear</h3><p class="muted">Add one small next action, or keep learning for now.</p></template>
          <div class="work-footer"><WorkComposer kind="task" label="Add a task" @saved="refreshWork()" /></div>
        </Card>
        <NuxtLink to="/ideas" class="inbox-link"><span class="section-icon"><CircleHelp :size="16" aria-hidden="true" /></span><span><strong>Idea inbox</strong><small>{{ ideaCount }} thoughts to revisit, without deadlines</small></span><ArrowRight :size="16" aria-hidden="true" /></NuxtLink>
      </section>
    </div>
    <div class="bottom-note"><span>From your source documents to your next action.</span><NuxtLink to="/connections">See what is connected <ArrowRight :size="14" aria-hidden="true" /></NuxtLink></div>
  </div>
</template>

<style scoped>
.today-page { max-width: 76rem; }
.today-top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; align-items: flex-end; padding: .4rem 0 2.4rem; }
.eyebrow, .card-kicker, .group-label, .mini-label { color: var(--accent); letter-spacing: .13em; font-size: .69rem; font-weight: 800; }
h1 { font-size: clamp(2.35rem, 5vw, 4.4rem); letter-spacing: -.045em; line-height: 1.05; max-width: 15ch; margin: .5rem 0 1rem; }
.lede { color: var(--muted); max-width: 38rem; margin: 0; font-size: 1.01rem; }
.today-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(19rem, .85fr); gap: 2rem; }
.section-title { display: flex; align-items: center; gap: .55rem; margin-bottom: .9rem; }
.section-title h2 { font-family: var(--font-ui); font-size: .95rem; font-weight: 700; margin: 0; }
.section-icon { display: inline-flex; color: var(--accent); }
.section-link { display: inline-flex; align-items: center; gap: .25rem; margin-left: auto; font-size: .78rem; }
.focus-card, .work-card, .mini-card { display: block; border-color: var(--border); background: var(--panel); color: var(--text); box-shadow: none; }
.focus-card { padding: 1.5rem; min-height: 17rem; border-top: 3px solid var(--accent); }
.track-label { margin: 1.2rem 0 .4rem; }
.focus-card h3 { font-family: var(--font-serif); font-size: clamp(1.4rem, 2.6vw, 1.9rem); line-height: 1.22; margin: .55rem 0 .6rem; }
.muted { color: var(--muted); }.error { color: var(--critical); }.small { font-size: .8rem; }
.focus-card .muted { max-width: 45ch; font-size: .9rem; }
.focus-footer { border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 1.3rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .7rem; }
.focus-footer span { color: var(--muted); font-size: .77rem; }
.primary-link { display: inline-flex; align-items: center; gap: .45rem; color: var(--accent); font-weight: 700; font-size: .85rem; }
.learning-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; margin-top: .75rem; }
.mini-card { padding: 1rem 1.15rem; display: flex; flex-direction: column; align-items: flex-start; }
.mini-label { display: flex; align-items: center; gap: .4rem; }
.mini-card strong { font-size: 2rem; line-height: 1; margin-top: .7rem; }
.mini-card .muted { font-size: .78rem; }
.mini-card a { display: inline-flex; align-items: center; gap: .3rem; margin-top: .75rem; font-size: .77rem; font-weight: 700; }
.journal-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .8rem; margin-top: 1rem; }
.journal-actions a { display: inline-flex; align-items: center; gap: .3rem; font-size: .8rem; }
.work-card { padding: 1.35rem; min-height: 20rem; }
.work-card h3 { font-size: 1.05rem; margin: 1.3rem 0 .3rem; }
.work-group { margin-top: 1.15rem; }
.group-label { color: var(--muted); }
.work-item { display: flex; align-items: flex-start; gap: .65rem; padding: .65rem 0; border-bottom: 1px solid var(--border); color: var(--text); font-size: .86rem; }
.work-item:hover { text-decoration: none; color: var(--accent); }
.work-item span:nth-child(2) { flex: 1; min-width: 0; }
.work-item strong { display: block; font-weight: 600; line-height: 1.3; }
.work-item small { display: block; color: var(--muted); font-size: .73rem; margin-top: .1rem; }
.work-dot { width: .48rem; height: .48rem; border: 1px solid var(--faint); border-radius: 50%; flex: 0 0 auto; margin-top: .35rem; }
.work-dot.active { background: var(--accent); border-color: var(--accent); }
.work-footer { margin-top: 1rem; }
.inbox-link { display: flex; align-items: center; gap: .7rem; margin-top: .75rem; padding: 1rem 1.1rem; background: var(--panel); border: 1px solid var(--border); border-radius: .65rem; color: var(--text); }
.inbox-link:hover { text-decoration: none; border-color: var(--accent); }
.inbox-link span:nth-child(2) { flex: 1; }
.inbox-link strong, .inbox-link small { display: block; }
.inbox-link strong { font-size: .84rem; }.inbox-link small { color: var(--muted); font-size: .72rem; }
.bottom-note { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; color: var(--faint); font-size: .77rem; margin: 3rem 0 0; border-top: 1px solid var(--border); padding-top: 1rem; }
.bottom-note a { display: inline-flex; align-items: center; gap: .25rem; }
@media (max-width: 58rem) { .today-grid { grid-template-columns: 1fr; }.today-top { padding-bottom: 2rem; } }
@media (max-width: 36rem) { .learning-row { grid-template-columns: 1fr 1fr; }.focus-card, .work-card { padding: 1.1rem; }.today-top h1 { font-size: 2.45rem; } }
@media (max-width: 36rem) { .work-card { min-height: 13rem; } }
</style>
