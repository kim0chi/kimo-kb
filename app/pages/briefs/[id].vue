<script setup lang="ts">
import { ArrowRight, Check } from '@lucide/vue'
import type { ReadingArtifact } from '~~/server/utils/artifacts'

const route = useRoute()
const { data, error, refresh } = await useFetch<{ artifact: ReadingArtifact }>(() => '/api/artifacts/' + route.params.id, { key: () => 'artifact:' + route.params.id })
const artifact = computed(() => data.value?.artifact)
useHead(() => ({ title: artifact.value ? artifact.value.title + ' — Kimo' : 'Guide — Kimo' }))
const changing = ref(false)
const mutationError = ref('')
const date = (value: string) => new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium' }).format(new Date(value))
const sections = computed(() => {
  const text = artifact.value?.content || ''
  const parts: { title: string; body: string }[] = []
  let title = ''
  let lines: string[] = []
  const flush = () => { if (lines.join('\n').trim()) parts.push({ title, body: lines.join('\n').trim() }); lines = [] }
  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^(?:#+\s*)?(In plain words|How it works|Check yourself):?$/i)
    if (match) { flush(); title = match[1] }
    else lines.push(line)
  }
  flush()
  return parts
})
async function toggleRead() {
  if (!artifact.value || changing.value) return
  changing.value = true
  mutationError.value = ''
  try {
    const result = await $fetch<{ artifact: ReadingArtifact }>('/api/artifacts/' + artifact.value.id, { method: 'PATCH', body: { read: !artifact.value.readAt } })
    data.value = result
    await refreshNuxtData(['reading-artifacts', 'reading-inbox'])
  } catch (cause: any) {
    mutationError.value = cause?.data?.statusMessage || 'Reading status could not be saved. Try again.'
  } finally { changing.value = false }
}
</script>

<template>
  <div class="guide-reader">
    <nav class="breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/briefs">Guides</NuxtLink><span aria-hidden="true">/</span><span>{{ artifact?.sourceTitle || 'Guide' }}</span></nav>
    <div v-if="error" class="error" role="alert">This guide could not be opened. <button type="button" @click="refresh()">Retry</button></div>
    <article v-else-if="artifact">
      <div class="guide-head">
        <div><p class="state" :class="{ read: artifact.readAt }">{{ artifact.readAt ? 'Read' : 'Unread' }} · Made {{ date(artifact.createdAt) }}</p><h1>{{ artifact.title }}</h1><p v-if="artifact.focus" class="focus">Focus: {{ artifact.focus }}</p></div>
        <button class="read-button" type="button" :disabled="changing" @click="toggleRead"><Check v-if="!artifact.readAt" :size="16" aria-hidden="true" />{{ changing ? 'Saving…' : artifact.readAt ? 'Mark unread' : 'Mark as read' }}</button>
      </div>
      <p v-if="mutationError" class="error" role="alert">{{ mutationError }}</p>
      <div class="guide-body">
        <section v-for="(section, index) in sections" :key="index">
          <h2 v-if="section.title">{{ section.title }}</h2>
          <p>{{ section.body }}</p>
        </section>
      </div>
      <footer><p>AI-written from <NuxtLink :to="artifact.sourcePath">{{ artifact.sourceTitle }} <ArrowRight :size="14" aria-hidden="true" /></NuxtLink>. Check the original for details.</p><NuxtLink to="/journal">Write what you understood <ArrowRight :size="14" aria-hidden="true" /></NuxtLink></footer>
    </article>
    <p v-else>Loading guide…</p>
  </div>
</template>

<style scoped>
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4
 * Read · Kimo terracotta · narrow guide with explicit read status */
.state.read{color:var(--muted)}
.guide-reader{max-width:48rem}.breadcrumb{display:flex;gap:.55rem;color:var(--muted);font-size:.8rem;margin-bottom:1.8rem}.breadcrumb a{color:var(--muted)}.guide-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1.5rem;flex-wrap:wrap;border-bottom:1px solid var(--border);padding-bottom:1.5rem}.state{color:var(--accent);font-size:.76rem;font-weight:700;margin:0 0 .6rem}h1{font:600 2.1rem/1.16 var(--font-serif);letter-spacing:-.02em;margin:0;overflow-wrap:anywhere}.focus{color:var(--muted);font-size:.87rem;line-height:1.5;margin:.75rem 0 0}.read-button{min-height:44px;display:inline-flex;align-items:center;gap:.4rem;border:1px solid var(--border);border-radius:.5rem;background:var(--panel);color:var(--text);font:700 .84rem var(--font-ui);padding:.55rem .8rem;cursor:pointer;white-space:nowrap}.read-button:hover{border-color:var(--accent)}.read-button:disabled{opacity:.5;cursor:not-allowed}.read-button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.guide-body{font:1.06rem/1.7 var(--font-ui);max-width:68ch;padding:1.2rem 0 2rem;overflow-wrap:anywhere}.guide-body section{margin:1.6rem 0}.guide-body h2{font:600 1.3rem/1.3 var(--font-serif);margin:0 0 .6rem}.guide-body p{white-space:pre-wrap;margin:0}footer{border-top:1px solid var(--border);padding-top:1.1rem;color:var(--muted);font-size:.84rem;line-height:1.6}footer a{display:inline-flex;align-items:center;gap:.2rem}footer p{margin:0 0 .7rem}.error{color:var(--critical)}.error button{border:0;background:none;color:var(--accent);font:inherit;cursor:pointer}@media(max-width:36rem){.guide-head{gap:1rem}h1{font-size:1.75rem}.read-button{width:100%;justify-content:center}}
</style>
