<script setup lang="ts">
import { ArrowLeft, ArrowRight, CircleCheck, RotateCcw } from '@lucide/vue'
import { Button } from '../../components/ui/button'
import type { AgentJob } from '~~/server/utils/agent-jobs'

const route = useRoute()
const id = String(route.params.id || '')
const { data, status, error, refresh } = await useFetch<{ job: AgentJob }>('/api/agent-jobs/' + encodeURIComponent(id))
const job = computed(() => data.value?.job)
const changing = ref(false)
const changeError = ref('')
useHead({ title: computed(() => job.value ? job.value.title + ' — Kimo' : 'Agent job — Kimo') })
const date = (value: string) => new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
async function toggleRead() {
  if (!job.value || changing.value) return
  changing.value = true
  changeError.value = ''
  try {
    await $fetch('/api/agent-jobs/' + id + '/read', { method: 'PATCH', body: { read: !job.value.readAt } })
    await refresh()
    await refreshNuxtData('agent-jobs')
  } catch (cause) {
    const failure = cause as { data?: { statusMessage?: string }; message?: string }
    changeError.value = failure.data?.statusMessage || failure.message || 'Could not update reading status.'
  } finally { changing.value = false }
}
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => { if (job.value?.status === 'queued' || job.value?.status === 'running') void refresh() }, 15_000) })
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div class="job-page">
    <NuxtLink to="/orchestrator" class="back"><ArrowLeft :size="15" aria-hidden="true" /> Project workflows</NuxtLink>
    <p v-if="status === 'pending'" class="state">Loading agent job…</p>
    <p v-else-if="error || !job" class="state error" role="alert">This agent job could not be loaded. <Button variant="outline" size="sm" @click="refresh()">Retry</Button></p>
    <template v-else>
      <header class="job-head"><div><h1>{{ job.title }}</h1><p>{{ job.project }} · {{ date(job.createdAt) }}</p></div><span class="status" :class="job.status">{{ job.status === 'ready' ? job.readAt ? 'Read' : 'Unread' : job.status === 'running' ? 'Writing' : job.status }}</span></header>
      <p class="brief">{{ job.brief }}</p>
      <p v-if="job.error" class="error" role="alert">{{ job.error }}</p>
      <div v-if="job.status === 'queued' || job.status === 'running'" class="pending"><p>{{ job.status === 'queued' ? 'Waiting for the configured workstation runner.' : 'Codex is writing in a reserved worktree.' }}</p><Button variant="outline" size="sm" @click="refresh()"><RotateCcw :size="14" aria-hidden="true" /> Refresh status</Button></div>
      <template v-if="job.status === 'ready'">
        <section class="reading" aria-labelledby="guide-title"><div class="section-head"><div><h2 id="guide-title">Learning guide</h2><p>Use this to trace the work, then answer the questions in your own words.</p></div><Button variant="outline" size="sm" :disabled="changing" @click="toggleRead"><CircleCheck :size="15" aria-hidden="true" /> {{ job.readAt ? 'Mark unread' : 'Mark read' }}</Button></div><p v-if="changeError" class="error" role="alert">{{ changeError }}</p><div class="reading-copy">{{ job.guideContent }}</div></section>
        <section class="reading draft" aria-labelledby="docs-title"><h2 id="docs-title">Documentation draft</h2><p>Saved on the agent’s branch for review. It has not been merged into the project’s main branch.</p><div class="reading-copy">{{ job.docsContent }}</div></section>
      </template>
      <section v-if="job.branch" class="handoff"><h2>Review handoff</h2><dl><dt>Branch</dt><dd><code>{{ job.branch }}</code></dd><template v-if="job.commitHash"><dt>Commit</dt><dd><code>{{ job.commitHash }}</code></dd></template><template v-if="job.worktreePath"><dt>Reserved worktree</dt><dd><code>{{ job.worktreePath }}</code></dd></template></dl><p>The files stay in this worktree until you review or merge them. <NuxtLink to="/orchestrator">Back to project workflows <ArrowRight :size="14" aria-hidden="true" /></NuxtLink></p></section>
    </template>
  </div>
</template>

<style scoped>
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
.job-page{max-width:52rem}.back{display:inline-flex;align-items:center;gap:.35rem;min-height:44px;font-size:.8rem;margin-bottom:1.4rem}.job-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}.job-head h1{font:600 clamp(1.9rem,4vw,2.8rem)/1.14 var(--font-ui);letter-spacing:-.025em;margin:0;overflow-wrap:anywhere}.job-head p{color:var(--muted);font-size:.8rem;margin:.35rem 0 0}.status{font-size:.76rem;font-weight:700;color:var(--accent);text-transform:capitalize;white-space:nowrap}.status.failed{color:var(--critical)}.status.running{color:var(--serious)}.status.queued,.status.cancelled{color:var(--muted)}.brief{max-width:70ch;color:var(--muted);margin:1.2rem 0 2rem;white-space:pre-wrap}.reading{border-top:1px solid var(--border);padding:1.3rem 0 2rem}.section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}.reading h2,.handoff h2{font:600 1.18rem var(--font-ui);margin:0 0 .25rem}.reading p,.handoff p{font-size:.84rem;color:var(--muted);margin:.2rem 0 1.1rem}.reading-copy{max-width:70ch;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.95rem;line-height:1.75;color:var(--text)}.draft{margin-top:1rem}.handoff{border-top:1px solid var(--border);padding-top:1.3rem;margin-bottom:3rem}.handoff dl{display:grid;grid-template-columns:7.5rem minmax(0,1fr);gap:.4rem .8rem;font-size:.78rem}.handoff dt{color:var(--muted)}.handoff dd{margin:0;min-width:0;overflow-wrap:anywhere}.handoff code{font-size:.75rem}.handoff a{display:inline-flex;align-items:center;gap:.2rem}.pending,.state{padding:1.2rem;background:var(--panel);border:1px solid var(--border);border-radius:.7rem}.pending p{margin:0 0 .8rem;color:var(--muted)}.error{color:var(--critical)}@media(max-width:40rem){.job-head,.section-head{flex-direction:column;align-items:flex-start}.handoff dl{grid-template-columns:minmax(0,1fr);gap:.15rem}.handoff dd{margin-bottom:.5rem}}
</style>
