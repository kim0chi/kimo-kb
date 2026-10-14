<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
interface Entry { id: string; concept: string; understanding: string; question: string; sourceUrl: string; createdAt: string }
interface Attempt { id: number; exerciseId: string; grade: number; attempt: string; createdAt: string }
useHead({ title: 'Learning journal — Kimo' })
const { data, status, error, refresh } = await useFetch<{ entries: Entry[]; attempts: Attempt[] }>('/api/journal', { key: 'journal' })
const date = (value: string) => new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium' }).format(new Date(value))
const confidence = ['Missed it', 'Shaky', 'Solid', 'Nailed it']
</script>

<template>
  <div class="journal">
    <div class="head"><div><p class="eyebrow">LEARNING JOURNAL</p><h1>What you understand grows here.</h1><p class="lede">Your own explanations and recall attempts, kept in order so you can see how your thinking changes.</p></div><LearningCapture @saved="refresh()" /></div>
    <p v-if="status === 'pending'" class="notice">Loading your learning history…</p>
    <p v-else-if="error" class="notice error">Could not load your journal. <button @click="refresh()">Retry</button></p>
    <template v-else>
      <section aria-labelledby="entries-title"><h2 id="entries-title">Explanations <span>{{ data?.entries.length ?? 0 }}</span></h2>
        <div v-if="!data?.entries.length" class="empty"><strong>Start with one thing you learned.</strong><p>Write it as if you were explaining it to a teammate. A short honest note is enough.</p></div>
        <ul v-else class="entry-list"><li v-for="entry in data?.entries" :key="entry.id" class="entry"><time :datetime="entry.createdAt">{{ date(entry.createdAt) }}</time><h3>{{ entry.concept }}</h3><p class="answer">{{ entry.understanding }}</p><p v-if="entry.question" class="question"><strong>Still wondering:</strong> {{ entry.question }}</p><a v-if="entry.sourceUrl" :href="entry.sourceUrl" target="_blank" rel="noopener noreferrer">Source <ArrowUpRight :size="14" aria-hidden="true" /></a></li></ul>
      </section>
      <section aria-labelledby="attempts-title"><h2 id="attempts-title">Recall attempts <span>{{ data?.attempts.length ?? 0 }}</span></h2>
        <p class="section-desc">Every graded explanation is saved. The exercise page still shows your most recent answer.</p>
        <div v-if="!data?.attempts.length" class="empty"><strong>No attempts yet.</strong><p>Practice an exercise from a notebook to build this history.</p><NuxtLink to="/library">Open the library →</NuxtLink></div>
        <ul v-else class="entry-list"><li v-for="attempt in data?.attempts" :key="attempt.id" class="entry"><time :datetime="attempt.createdAt">{{ date(attempt.createdAt) }}</time><h3>{{ attempt.exerciseId.replaceAll('-', ' ').replaceAll('_', ' ') }}</h3><span class="grade">{{ confidence[attempt.grade] ?? 'Reviewed' }}</span><p class="answer">{{ attempt.attempt || 'No written answer' }}</p></li></ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.journal { max-width: 60rem; }
.head { display: flex; justify-content: space-between; align-items: end; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
.eyebrow { color: var(--accent); font-size: .7rem; letter-spacing: .13em; font-weight: 800; }
h1 { font-size: clamp(2rem, 4vw, 3.1rem); letter-spacing: -.035em; line-height: 1.13; margin: .3rem 0 .6rem; }
.lede { color: var(--muted); max-width: 38rem; margin: 0; }
section { margin: 2.5rem 0; }h2 { font-family: var(--font-ui); font-size: 1rem; border-bottom: 1px solid var(--border); padding-bottom: .5rem; }h2 span { color: var(--muted); font-size: .75rem; font-weight: 400; margin-left: .3rem; }
.section-desc { color: var(--muted); font-size: .86rem; }
.empty,.notice { background: var(--panel); border: 1px dashed var(--border); border-radius: .7rem; padding: 1.5rem; color: var(--muted); }.empty strong { color: var(--text); }.empty p { margin: .3rem 0; }
.entry-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .7rem; }
.entry { padding: 1.2rem 1.4rem; background: var(--panel); border: 1px solid var(--border); border-radius: .7rem; }
.entry time { color: var(--muted); font-size: .73rem; }.entry h3 { margin: .3rem 0 .45rem; font-family: var(--font-serif); font-size: 1.15rem; }
.answer { margin: 0; white-space: pre-wrap; font-size: .88rem; }.question { color: var(--muted); font-size: .83rem; }
.entry a { display: inline-flex; align-items: center; gap: .25rem; font-size: .78rem; margin-top: .4rem; }
.grade { color: var(--accent); font-size: .75rem; font-weight: 700; }.error { color: var(--critical); }
</style>
