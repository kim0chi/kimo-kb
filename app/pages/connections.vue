<script setup lang="ts">
import { ArrowUpRight, BookOpen, GitBranch, MessageSquareText, Network, ShieldCheck } from '@lucide/vue'
useHead({ title: 'Connections — Kimo' })
const { data, status, error } = await useFetch<{ notebooks: { id: string; title: string; docCount: number }[] }>('/api/notebooks', { key: 'notebooks' })
const sources = computed(() => data.value?.notebooks ?? [])
const { data: assistant } = await useFetch<{ configured: boolean; model: string; sources: { path: string }[] }>('/api/assistant/status')
</script>

<template>
  <div class="connections">
    <p class="eyebrow">SYSTEM STATUS</p>
    <h1>Connections</h1>
    <p class="lede">A clear view of what Kimo reads today and what still needs setup.</p>
    <section class="connection-group">
      <h2>Available in this build</h2>
      <div class="connection-card"><span class="icon"><BookOpen :size="20" aria-hidden="true" /></span><div><h3>Local knowledge library</h3><p>Kimo reads your configured notebook manifests and documents in place. Reading state, notes, work items and learning entries are stored in its local SQLite database.</p><p v-if="status === 'pending'" class="detail">Checking notebooks…</p><p v-else-if="error" class="detail error">Notebook status is unavailable.</p><p v-else class="detail">{{ sources.length }} notebook{{ sources.length === 1 ? '' : 's' }} available · {{ sources.reduce((sum, item) => sum + (item.docCount || 0), 0) }} documents indexed</p><NuxtLink to="/library">Open library <ArrowUpRight :size="14" aria-hidden="true" /></NuxtLink></div><span class="state available">LOCAL</span></div>
      <div class="connection-card"><span class="icon"><MessageSquareText :size="20" aria-hidden="true" /></span><div><h3>OpenAI study companion</h3><p>Ask about one selected personal learning document. The server validates its source, then sends a bounded excerpt and your question to the OpenAI Responses API. SI and external work documents are excluded.</p><p class="detail">{{ assistant?.sources.length || 0 }} eligible sources · {{ assistant?.model || 'gpt-6.1-sol' }} · {{ assistant?.configured ? 'API key configured' : 'API key needed on server' }}</p><NuxtLink to="/ask">Open assistant <ArrowUpRight :size="14" aria-hidden="true" /></NuxtLink></div><span class="state" :class="assistant?.configured ? 'available' : 'planned'">{{ assistant?.configured ? 'READY' : 'SETUP' }}</span></div>
      <div class="connection-card"><span class="icon"><ShieldCheck :size="20" aria-hidden="true" /></span><div><h3>Private access</h3><p>The app is designed for a private tailnet. Remote access depends on the NUC deployment and Tailscale configuration; this page cannot verify that connection from the browser.</p></div><span class="state planned">DEPLOYMENT SETUP</span></div>
    </section>
    <section class="connection-group">
      <h2>Planned connections</h2>
      <div class="connection-card"><span class="icon"><GitBranch :size="20" aria-hidden="true" /></span><div><h3>GitHub projects</h3><p>Read repository and pull request status into work items, then link a task to its source. Personal status and GitHub status will stay distinct.</p></div><span class="state planned">NOT CONNECTED</span></div>
      <div class="connection-card"><span class="icon"><Network :size="20" aria-hidden="true" /></span><div><h3>Related knowledge</h3><p>Keyword and title search is available in the KB. Chunk-level search, vectors, and a query-scoped document graph are later milestones.</p></div><span class="state planned">PLANNED</span></div>
    </section>
    <p class="privacy-note">SI documents may contain internal information. Provider integration needs an explicit scope and retention choice before any source text is sent outside the NUC.</p>
  </div>
</template>

<style scoped>
.connections { max-width: 65rem; }
.eyebrow { color: var(--accent); font-size: .7rem; letter-spacing: .13em; font-weight: 800; }
h1 { font-size: clamp(2rem, 4vw, 3.1rem); margin: .2rem 0 .3rem; }
.lede { margin: 0 0 2.3rem; color: var(--muted); }
.connection-group { margin: 2rem 0; }.connection-group h2 { font-family: var(--font-ui); font-size: .95rem; margin-bottom: .8rem; }
.connection-card { display: flex; align-items: flex-start; gap: 1rem; padding: 1.25rem; border: 1px solid var(--border); border-radius: .75rem; background: var(--panel); margin-bottom: .65rem; }
.icon { flex: 0 0 auto; color: var(--accent); margin-top: .2rem; }.connection-card > div { flex: 1; min-width: 0; }.connection-card h3 { font-size: .95rem; margin: 0 0 .2rem; }.connection-card p { color: var(--muted); font-size: .85rem; line-height: 1.55; margin: 0; }.connection-card .detail { margin-top: .6rem; color: var(--text); }.connection-card .detail.error { color: var(--critical); }.connection-card a { display: inline-flex; align-items: center; gap: .2rem; margin-top: .55rem; font-size: .8rem; }
.state { flex: 0 0 auto; padding: .2rem .45rem; border: 1px solid var(--border); border-radius: .3rem; color: var(--muted); font-size: .63rem; font-weight: 800; letter-spacing: .05em; }.state.available { color: var(--good); border-color: var(--good); }
.privacy-note { border-left: 3px solid var(--accent); padding: .75rem 1rem; color: var(--muted); font-size: .83rem; background: var(--accent-soft); }
@media (max-width: 40rem) { .connection-card { gap: .6rem; flex-wrap: wrap; }.state { margin-left: auto; } }
</style>
