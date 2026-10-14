<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { ReadingArtifact } from '~~/server/utils/artifacts'

useHead({ title: 'Make a guide — Kimo' })
type Source = { path: string; title: string; notebook: string }
type Status = { configured: boolean; sources: Source[] }
const route = useRoute()
const { data: status, error: statusError } = await useFetch<Status>('/api/assistant/status')
const selected = ref(typeof route.query.source === 'string' ? route.query.source : '')
const focus = ref('')
const pending = ref(false)
const error = ref('')
const sources = computed(() => status.value?.sources || [])
watch(sources, list => {
  if (!list.some(item => item.path === selected.value)) selected.value = list[0]?.path || ''
}, { immediate: true })

async function makeGuide() {
  if (!selected.value || !status.value?.configured || pending.value) return
  pending.value = true
  error.value = ''
  try {
    const result = await $fetch<{ artifact: ReadingArtifact }>('/api/assistant/ask', {
      method: 'POST',
      body: { path: selected.value, question: focus.value },
    })
    await refreshNuxtData('reading-artifacts')
    await navigateTo('/briefs/' + result.artifact.id)
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || 'The guide could not be made. Try again.'
  } finally { pending.value = false }
}
</script>

<template>
  <div class="guide-maker">
    <nav class="breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/briefs">Guides</NuxtLink><span aria-hidden="true">/</span> New guide</nav>
    <h1>Make a guide</h1>
    <p class="lede">Choose a source. Kimo will write a short, plain-language version for your reading list.</p>

    <p v-if="statusError" class="error" role="alert">Sources could not be loaded. Reload this page.</p>
    <form v-else @submit.prevent="makeGuide">
      <label for="source">Source</label>
      <select id="source" v-model="selected" :disabled="pending || !sources.length">
        <option v-if="!sources.length" value="">No eligible sources</option>
        <option v-for="source in sources" :key="source.path" :value="source.path">{{ source.title }}</option>
      </select>
      <NuxtLink v-if="selected" class="source-link" :to="selected">Read original source <ArrowRight :size="14" aria-hidden="true" /></NuxtLink>

      <label for="focus">Focus <span>(optional)</span></label>
      <textarea id="focus" v-model="focus" :disabled="pending || !sources.length" rows="3" maxlength="2000" placeholder="For example: explain the difference between an array and a map" />
      <p class="hint">The guide will be saved as unread. Mark it read when you finish.</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="pending || !selected || !status?.configured">{{ pending ? 'Writing guide…' : 'Make guide' }} <ArrowRight :size="16" aria-hidden="true" /></button>
    </form>

    <p v-if="!status?.configured && !statusError" class="setup">OpenAI is not connected. Add a server-side API key to make guides. <NuxtLink to="/connections">Connection details</NuxtLink></p>
    <p class="privacy">Only the selected personal source excerpt and your optional focus go to OpenAI when you make a guide. SI and external work documents are excluded.</p>
  </div>
</template>

<style scoped>
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4
 * Operate · Kimo terracotta · source, optional focus, one action */
.guide-maker{max-width:42rem}.breadcrumb{display:flex;gap:.55rem;color:var(--muted);font-size:.8rem;margin-bottom:1.25rem}.breadcrumb a{color:var(--muted)}h1{font:600 2.2rem/1.15 var(--font-ui);letter-spacing:-.025em;margin:0 0 .5rem}.lede{max-width:40rem;color:var(--muted);line-height:1.55;margin:0 0 2rem}form{display:flex;flex-direction:column;align-items:flex-start;gap:.55rem}label{font-size:.86rem;font-weight:700;margin-top:1.2rem}label span{font-weight:400;color:var(--muted)}select,textarea{width:100%;border:1px solid var(--border);border-radius:.55rem;background:var(--panel);color:var(--text);font:inherit;padding:.75rem .85rem}textarea{resize:vertical;line-height:1.5}select:focus-visible,textarea:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.source-link{display:inline-flex;align-items:center;gap:.3rem;font-size:.8rem}.hint,.privacy{color:var(--muted);font-size:.8rem;line-height:1.55}.hint{margin:.1rem 0 .6rem}.privacy{border-top:1px solid var(--border);padding-top:1rem;margin-top:2rem}.setup{background:var(--panel);border:1px solid var(--border);border-radius:.6rem;padding:1rem;color:var(--muted);font-size:.86rem}.error{color:var(--critical);font-size:.85rem}button{display:inline-flex;align-items:center;gap:.55rem;border:0;border-radius:.5rem;background:var(--accent);color:var(--on-accent);font:700 .88rem var(--font-ui);padding:.75rem 1rem;cursor:pointer;min-height:44px}button:disabled{opacity:.5;cursor:not-allowed}
</style>
