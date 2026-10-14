<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { ReadingArtifactSummary } from '~~/server/utils/artifacts'

useHead({ title: 'Guides — Kimo' })
const { data, status, error, refresh } = await useFetch<{ items: ReadingArtifactSummary[] }>('/api/artifacts', { key: 'reading-artifacts' })
const unread = computed(() => (data.value?.items || []).filter(item => !item.readAt))
const read = computed(() => (data.value?.items || []).filter(item => !!item.readAt))
const date = (value: string) => new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium' }).format(new Date(value))
function excerpt(content: string) {
  return content.split(/\r?\n/).map(line => line.trim())
    .find(line => line && !/^(?:#+\s*)?(?:In plain words|How it works|Check yourself):?$/i.test(line))
    ?.slice(0, 170) || ''
}
</script>

<template>
  <div class="guides-page">
    <div class="page-head">
      <div><h1>Guides</h1><p>Short explanations made from your personal sources. Read them when you have room to think.</p></div>
      <NuxtLink to="/ask" class="create-link">Make a guide <ArrowRight :size="16" aria-hidden="true" /></NuxtLink>
    </div>
    <p v-if="status === 'pending'" class="state">Loading your guides…</p>
    <p v-else-if="error" class="state error" role="alert">Guides could not be loaded. <button type="button" @click="refresh()">Retry</button></p>
    <div v-else-if="!data?.items.length" class="empty"><h2>Nothing to read yet</h2><p>Choose one personal document and let Kimo make a simpler version.</p><NuxtLink to="/ask">Make your first guide <ArrowRight :size="15" aria-hidden="true" /></NuxtLink></div>
    <template v-else>
      <section v-if="unread.length" aria-labelledby="unread-heading">
        <h2 id="unread-heading">To read <span>{{ unread.length }}</span></h2>
        <ul class="guide-list"><li v-for="item in unread" :key="item.id"><NuxtLink :to="'/briefs/' + item.id"><span class="guide-main"><strong>{{ item.title }}</strong><small>{{ item.sourceTitle }} · {{ date(item.createdAt) }}</small><span class="excerpt">{{ excerpt(item.preview) }}</span></span><span class="state-label">Unread</span></NuxtLink></li></ul>
      </section>
      <section v-if="read.length" aria-labelledby="read-heading">
        <h2 id="read-heading">Read <span>{{ read.length }}</span></h2>
        <ul class="guide-list"><li v-for="item in read" :key="item.id"><NuxtLink :to="'/briefs/' + item.id"><span class="guide-main"><strong>{{ item.title }}</strong><small>{{ item.sourceTitle }} · {{ date(item.createdAt) }}</small></span><span class="state-label read-label">Read</span></NuxtLink></li></ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4
 * Read · Kimo terracotta · unread list before reading history */
.guides-page{max-width:52rem}.page-head{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1.2rem;margin-bottom:2.2rem}h1{font:600 2.2rem/1.15 var(--font-ui);letter-spacing:-.025em;margin:0 0 .45rem}.page-head p{color:var(--muted);margin:0;max-width:38rem;line-height:1.5}.create-link{display:inline-flex;align-items:center;gap:.4rem;background:var(--accent);color:var(--on-accent);padding:.7rem .9rem;border-radius:.5rem;font-size:.86rem;font-weight:700;min-height:44px;white-space:nowrap}.create-link:hover{text-decoration:none;opacity:.9}section{margin:2rem 0}section h2{font:700 1rem var(--font-ui);border-bottom:1px solid var(--border);padding-bottom:.65rem;margin:0}section h2 span{color:var(--muted);font-weight:400;margin-left:.3rem}.guide-list{list-style:none;padding:0;margin:0}.guide-list li{border-bottom:1px solid var(--border)}.guide-list a{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;color:var(--text);padding:1rem .15rem}.guide-list a:hover{text-decoration:none;color:var(--accent)}.guide-main{min-width:0}.guide-main strong{display:block;font-size:.96rem;line-height:1.35}.guide-main small,.excerpt{display:block;color:var(--muted);font-size:.78rem;margin-top:.25rem}.excerpt{font-size:.84rem;line-height:1.45;max-width:65ch;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.state-label{flex:none;color:var(--accent);font-size:.73rem;font-weight:700}.read-label{color:var(--muted)}.empty,.state{background:var(--panel);border:1px solid var(--border);border-radius:.7rem;padding:1.4rem}.empty h2{font-size:1rem;margin:0 0 .3rem}.empty p,.state{color:var(--muted);font-size:.87rem}.empty a{display:inline-flex;align-items:center;gap:.3rem;font-size:.85rem}.error{color:var(--critical)}button{color:var(--accent);border:0;background:none;cursor:pointer;font:inherit}@media(max-width:34rem){.page-head{margin-bottom:1.5rem}.guide-list a{gap:.5rem}}
</style>
