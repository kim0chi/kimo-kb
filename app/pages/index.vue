<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import { Card } from '@/components/ui/card'
import { pickNext, type RoadmapTrack } from '~~/lib/roadmap'
import type { WorkItem } from '~~/server/utils/work-items'
import type { ReadingArtifactSummary } from '~~/server/utils/artifacts'

useHead({ title: 'Today — Kimo' })
const { data: notebooks, error: notebookError } = await useFetch<{ notebooks: { id: string; due: number; exercisesDue: number }[] }>('/api/notebooks', { key: 'notebooks' })
const { data: roadmap, status: roadmapStatus, error: roadmapError } = await useFetch<{ tracks: RoadmapTrack[]; error?: string }>('/api/roadmap', { key: 'roadmap' })
const { data: work, status: workStatus, error: workError, refresh: refreshWork } = await useFetch<{ items: WorkItem[] }>('/api/work-items', { key: 'work-items' })
const { data: guides, status: guidesStatus, error: guidesError } = await useFetch<{ items: ReadingArtifactSummary[] }>('/api/artifacts', { key: 'reading-artifacts' })
const { statusOf } = useReadingState()
const dateLabel = new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
const next = computed(() => pickNext(roadmap.value?.tracks ?? [], statusOf))
const unreadGuides = computed(() => (guides.value?.items || []).filter(item => !item.readAt))
const active = computed(() => (work.value?.items ?? []).filter(item => item.status === 'active' && item.kind !== 'idea').slice(0, 3))
const queued = computed(() => (work.value?.items ?? []).filter(item => item.status === 'queued' && item.kind !== 'idea').slice(0, 2))
const ideaCount = computed(() => (work.value?.items ?? []).filter(item => item.kind === 'idea' && item.status !== 'archived').length)
const dueCount = computed(() => (notebooks.value?.notebooks ?? []).reduce((sum, notebook) => sum + notebook.due + notebook.exercisesDue, 0))
const reviewNotebook = computed(() => (notebooks.value?.notebooks ?? []).find(notebook => notebook.due || notebook.exercisesDue))
</script>

<template>
  <div class="today-page">
    <header class="today-head">
      <div><p class="date">{{ dateLabel }}</p><h1>Today</h1><p>Pick up one useful thread.</p></div>
      <WorkComposer kind="idea" label="Capture an idea" @saved="refreshWork()" />
    </header>

    <div class="today-grid">
      <div class="primary-column">
        <section aria-labelledby="learn-title">
          <h2 id="learn-title">Learn next</h2>
          <Card class="focus">
            <p v-if="roadmapStatus === 'pending'" class="muted">Finding your next step…</p>
            <p v-else-if="roadmapError || roadmap?.error" class="error">Your learning path could not be read. <NuxtLink to="/learn">Open the path</NuxtLink></p>
            <template v-else-if="next">
              <p class="context">{{ next.trackTitle }} · {{ next.moduleTitle }}</p>
              <h3>{{ next.step.title }}</h3>
              <p v-if="next.step.objective" class="muted">{{ next.step.objective }}</p>
              <NuxtLink :to="next.entry || '/learn'" class="primary-link">Continue learning <ArrowRight :size="16" aria-hidden="true" /></NuxtLink>
            </template>
            <template v-else><h3>Choose a topic</h3><p class="muted">Start with one source you want to understand.</p><NuxtLink to="/learn" class="primary-link">Open learning path <ArrowRight :size="16" aria-hidden="true" /></NuxtLink></template>
          </Card>
          <div class="learning-actions">
            <NuxtLink v-if="reviewNotebook && dueCount" :to="reviewNotebook.due ? '/' + reviewNotebook.id + '/review' : '/' + reviewNotebook.id + '/exercises'">Practice recall · {{ dueCount }} ready <ArrowRight :size="14" aria-hidden="true" /></NuxtLink>
            <span v-else-if="notebookError" class="error">Review count unavailable</span>
            <LearningCapture />
            <NuxtLink to="/journal">Learning journal <ArrowRight :size="14" aria-hidden="true" /></NuxtLink>
          </div>
        </section>

        <section class="guides-section" aria-labelledby="guides-title">
          <div class="section-head"><h2 id="guides-title">Guides to read <span v-if="unreadGuides.length">{{ unreadGuides.length }}</span></h2><NuxtLink to="/briefs">All guides <ArrowRight :size="14" aria-hidden="true" /></NuxtLink></div>
          <p v-if="guidesStatus === 'pending'" class="muted">Loading guides…</p>
          <p v-else-if="guidesError" class="error">Guides could not be loaded.</p>
          <ul v-else-if="unreadGuides.length" class="guide-list"><li v-for="item in unreadGuides.slice(0, 2)" :key="item.id"><NuxtLink :to="'/briefs/' + item.id"><span><strong>{{ item.title }}</strong><small>{{ item.sourceTitle }} · Unread</small></span><ArrowRight :size="16" aria-hidden="true" /></NuxtLink></li></ul>
          <p v-else class="muted">No guides waiting. <NuxtLink to="/ask">Make one from a personal source</NuxtLink>.</p>
        </section>
      </div>

      <section class="work-column" aria-labelledby="work-title">
        <div class="section-head"><h2 id="work-title">Work in motion</h2><NuxtLink to="/work">Full queue <ArrowRight :size="14" aria-hidden="true" /></NuxtLink></div>
        <p v-if="workStatus === 'pending'" class="muted">Loading your queue…</p>
        <p v-else-if="workError" class="error">Your queue could not be loaded. <button type="button" @click="refreshWork()">Retry</button></p>
        <template v-else-if="active.length || queued.length">
          <div v-if="active.length" class="work-group"><h3>Active</h3><NuxtLink v-for="item in active" :key="item.id" to="/work" class="work-item"><span><strong>{{ item.title }}</strong><small v-if="item.project">{{ item.project }}</small></span><ArrowRight :size="15" aria-hidden="true" /></NuxtLink></div>
          <div v-if="queued.length" class="work-group"><h3>Up next</h3><NuxtLink v-for="item in queued" :key="item.id" to="/work" class="work-item"><span><strong>{{ item.title }}</strong><small v-if="item.project">{{ item.project }}</small></span><ArrowRight :size="15" aria-hidden="true" /></NuxtLink></div>
        </template>
        <p v-else class="muted">Your queue is clear. Add one next action when you need it.</p>
        <div class="work-actions"><WorkComposer kind="task" label="Add a task" @saved="refreshWork()" /><NuxtLink to="/ideas">{{ ideaCount }} ideas saved <ArrowRight :size="14" aria-hidden="true" /></NuxtLink></div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4
 * Operate · Kimo terracotta · next step, reading queue, work list */
.today-page{max-width:70rem}.today-head{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:1rem;border-bottom:1px solid var(--border);padding:0 0 1.6rem;margin-bottom:2rem}.date{color:var(--muted);font-size:.78rem;margin:0 0 .3rem}.today-head h1{font:600 2.35rem/1.15 var(--font-ui);letter-spacing:-.025em;margin:0}.today-head p:last-child{color:var(--muted);margin:.3rem 0 0}.today-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(16rem,.8fr);gap:3rem}.primary-column,.work-column{min-width:0}h2{font:700 1rem var(--font-ui);margin:0 0 .8rem}.focus{display:block;border:1px solid var(--border);background:var(--panel);color:var(--text);box-shadow:none;padding:1.35rem}.focus .context{color:var(--muted);font-size:.75rem;margin:0}.focus h3{font:600 1.45rem/1.25 var(--font-serif);margin:.5rem 0;overflow-wrap:anywhere}.focus .muted{margin:.4rem 0 1.2rem;font-size:.88rem;line-height:1.55}.primary-link{display:inline-flex;align-items:center;gap:.4rem;font-size:.86rem;font-weight:700}.learning-actions{display:flex;align-items:center;gap:.75rem 1.2rem;flex-wrap:wrap;margin:1rem 0 0;font-size:.82rem}.learning-actions a,.section-head a,.work-actions a{display:inline-flex;align-items:center;gap:.28rem}.guides-section{margin-top:2.5rem}.section-head{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;margin-bottom:.8rem}.section-head h2{margin:0}.section-head h2 span{font-size:.8rem;color:var(--muted);font-weight:400;margin-left:.2rem}.section-head a{font-size:.8rem;white-space:nowrap}.guide-list{list-style:none;padding:0;margin:0;border-top:1px solid var(--border)}.guide-list li{border-bottom:1px solid var(--border)}.guide-list a{display:flex;align-items:center;justify-content:space-between;gap:.7rem;padding:.85rem 0;color:var(--text)}.guide-list a:hover{text-decoration:none;color:var(--accent)}.guide-list a span{flex:1;min-width:0}.guide-list strong,.guide-list small{display:block}.guide-list strong{font-size:.87rem;line-height:1.3}.guide-list small{font-size:.75rem;color:var(--muted);margin-top:.2rem}.work-column{border-left:1px solid var(--border);padding-left:2rem}.work-group{margin:1.2rem 0}.work-group h3{color:var(--muted);font:700 .74rem var(--font-ui);margin:0 0 .35rem}.work-item{display:flex;justify-content:space-between;gap:.5rem;border-bottom:1px solid var(--border);padding:.7rem 0;color:var(--text)}.work-item:hover{text-decoration:none;color:var(--accent)}.work-item span{min-width:0}.work-item strong,.work-item small{display:block}.work-item strong{font-size:.86rem;line-height:1.3}.work-item small{color:var(--muted);font-size:.74rem;margin-top:.15rem}.work-actions{display:flex;align-items:center;flex-wrap:wrap;gap:.8rem;margin-top:1.2rem}.work-actions a{font-size:.8rem}.muted{color:var(--muted);font-size:.86rem;line-height:1.5}.error{color:var(--critical);font-size:.84rem}.error button{background:none;border:0;color:var(--accent);font:inherit;cursor:pointer}@media(max-width:56rem){.today-grid{grid-template-columns:1fr;gap:2.5rem}.work-column{border-left:0;border-top:1px solid var(--border);padding:1.5rem 0 0}}@media(max-width:32rem){.today-head{align-items:flex-start}.focus{padding:1.1rem}.section-head{flex-wrap:wrap}}
</style>
