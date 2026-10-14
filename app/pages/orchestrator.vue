<script setup lang="ts">
import { ArrowRight, RotateCcw, BookOpenText, FilePenLine, Workflow } from '@lucide/vue'
import { Button } from '../components/ui/button'
import type { WorkflowRun } from '~~/server/utils/workflows'
import type { WorkItem } from '~~/server/utils/work-items'
import type { AgentJobSummary } from '~~/server/utils/agent-jobs'

useHead({ title: 'Workflows — Kimo' })
type Source = { path: string; title: string; notebook: string }
const { data, status, error: loadError, refresh } = await useFetch<{ runs: WorkflowRun[]; workItems: WorkItem[] }>('/api/workflows', { key: 'workflows' })
const { data: assistant } = await useFetch<{ configured: boolean; sources: Source[] }>('/api/assistant/status')
type Runner = { id: string; projects: string[]; providers: string[]; seenAt: string; online: boolean }
const { data: agentData, refresh: refreshAgents } = await useFetch<{ jobs: AgentJobSummary[]; runners: Runner[] }>('/api/agent-jobs', { key: 'agent-jobs' })
const mode = ref<'guide' | 'repository'>('repository')
const project = ref('')
const sourcePath = ref('')
const workItemId = ref('')
const focus = ref('')
const busy = ref(false)
const activeRun = ref('')
const formError = ref('')
const actionError = ref('')
const drafts = reactive<Record<string, string>>({})
const repoProject = ref('')
const jobProvider = ref('codex')
const jobTitle = ref('')
const jobBrief = ref('')
const jobWorkItemId = ref('')
const jobBusy = ref(false)
const jobError = ref('')
const changingJob = ref('')
const registeredProjects = computed(() => [...new Set((agentData.value?.runners || []).flatMap(runner => runner.projects))].sort())
const jobProviders = computed(() => [...new Set((agentData.value?.runners || []).filter(runner => runner.projects.includes(repoProject.value)).flatMap(runner => runner.providers))])
const runnerOnline = computed(() => (agentData.value?.runners || []).some(runner => runner.online && runner.projects.includes(repoProject.value) && runner.providers.includes(jobProvider.value)))
watch(jobProviders, providers => { if (!providers.includes(jobProvider.value)) jobProvider.value = providers[0] || 'codex' }, { immediate: true })
const repoTasks = computed(() => (data.value?.workItems || []).filter(item => item.project === repoProject.value && item.kind !== 'idea' && item.status !== 'archived'))
const projects = computed(() => [...new Set([
  ...(data.value?.runs || []).map(run => run.project),
  ...(data.value?.workItems || []).map(item => item.project).filter(Boolean),
  ...(agentData.value?.jobs || []).map(job => job.project),
])].sort((a, b) => a.localeCompare(b)))
const grouped = computed(() => projects.value.map(name => ({
  name,
  runs: (data.value?.runs || []).filter(run => run.project === name),
  jobs: (agentData.value?.jobs || []).filter(job => job.project === name),
  tasks: (data.value?.workItems || []).filter(item => item.project === name && item.kind !== 'idea' && item.status !== 'archived'),
})))
const linkedTasks = computed(() => (data.value?.workItems || []).filter(item => item.project === project.value && item.kind !== 'idea' && item.status !== 'archived'))
const sources = computed(() => assistant.value?.sources || [])
watch(sources, items => {
  if (!items.some(item => item.path === sourcePath.value)) sourcePath.value = items[0]?.path || ''
}, { immediate: true })
watch(project, () => { workItemId.value = '' })
watch(repoProject, () => { jobWorkItemId.value = '' })
watch(registeredProjects, names => {
  if (!names.includes(repoProject.value)) repoProject.value = names[0] || ''
}, { immediate: true })
watch(jobWorkItemId, id => {
  const task = repoTasks.value.find(item => item.id === id)
  if (task && !jobTitle.value.trim()) jobTitle.value = task.title
})
watch(() => data.value?.runs, runs => {
  for (const run of runs || []) if (!(run.id in drafts)) drafts[run.id] = run.noteDraft
}, { immediate: true })

function message(cause: unknown): string {
  const failure = cause as { data?: { statusMessage?: string }; message?: string }
  return failure.data?.statusMessage || failure.message || 'The action failed. Try again.'
}

async function startRun() {
  if (busy.value) return
  if (!project.value.trim() || !sourcePath.value) {
    formError.value = 'Choose a project and a personal source.'
    return
  }
  busy.value = true
  formError.value = ''
  try {
    const result = await $fetch<{ run: WorkflowRun }>('/api/workflows', {
      method: 'POST',
      body: { project: project.value, sourcePath: sourcePath.value, workItemId: workItemId.value || null, focus: focus.value },
    })
    await refresh()
    if (result.run.status === 'failed') formError.value = result.run.error
    else focus.value = ''
  } catch (cause) { formError.value = message(cause) }
  finally { busy.value = false }
}

async function act(run: WorkflowRun, action: 'retry' | 'document') {
  if (activeRun.value) return
  activeRun.value = run.id
  actionError.value = ''
  try {
    const result = await $fetch<{ run: WorkflowRun }>(`/api/workflows/${run.id}/${action}`, {
      method: 'POST',
      body: action === 'document' ? { noteDraft: drafts[run.id] } : {},
    })
    await refresh()
    if (result.run.status === 'failed') actionError.value = result.run.error
  } catch (cause) { actionError.value = message(cause) }
  finally { activeRun.value = '' }
}

const date = (value: string) => new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium' }).format(new Date(value))

async function refreshAll() { await Promise.all([refresh(), refreshAgents()]) }
async function queueJob() {
  if (jobBusy.value) return
  jobBusy.value = true
  jobError.value = ''
  try {
    await $fetch('/api/agent-jobs', {
      method: 'POST',
      body: { project: repoProject.value, provider: jobProvider.value, workItemId: jobWorkItemId.value || null, title: jobTitle.value, brief: jobBrief.value },
    })
    jobTitle.value = ''
    jobBrief.value = ''
    jobWorkItemId.value = ''
    await refreshAgents()
  } catch (cause) { jobError.value = message(cause) }
  finally { jobBusy.value = false }
}
async function cancelJob(job: AgentJobSummary) {
  if (changingJob.value) return
  changingJob.value = job.id
  jobError.value = ''
  try {
    await $fetch('/api/agent-jobs/' + job.id + '/cancel', { method: 'POST' })
    await refreshAgents()
  } catch (cause) { jobError.value = message(cause) }
  finally { changingJob.value = '' }
}
let refreshTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => { refreshTimer = setInterval(() => { void refreshAgents() }, 15_000) })
onBeforeUnmount(() => { if (refreshTimer) clearInterval(refreshTimer) })
</script>

<template>
  <div class="orchestrator">
    <header class="page-head">
      <div><h1>Workflows by project</h1><p>Keep the work, the agent’s output, and the next documentation step together.</p></div>
      <Button variant="outline" size="sm" :disabled="status === 'pending'" @click="refreshAll"><RotateCcw :size="15" aria-hidden="true" /> Refresh</Button>
    </header>

    <div class="mode-switch" role="group" aria-label="Choose workflow type">
      <button type="button" :aria-pressed="mode === 'guide'" :class="{ chosen: mode === 'guide' }" @click="mode = 'guide'">Guide from source</button>
      <button type="button" :aria-pressed="mode === 'repository'" :class="{ chosen: mode === 'repository' }" @click="mode = 'repository'">Repository agent</button>
    </div>
    <section v-if="mode === 'guide'" class="start-panel" aria-labelledby="start-title">
      <div class="panel-intro"><h2 id="start-title">Start a learning guide</h2><p>Choose one personal document. The guide agent will write a short explanation and save a note draft for review.</p></div>
      <form class="run-form" @submit.prevent="startRun">
        <label for="workflow-project">Project</label>
        <input id="workflow-project" v-model="project" list="workflow-projects" maxlength="120" placeholder="e.g. Kimo" required>
        <datalist id="workflow-projects"><option v-for="name in projects" :key="name" :value="name" /></datalist>
        <label for="workflow-source">Personal source</label>
        <select id="workflow-source" v-model="sourcePath" :disabled="!sources.length">
          <option v-if="!sources.length" value="">No eligible sources</option>
          <option v-for="source in sources" :key="source.path" :value="source.path">{{ source.title }}</option>
        </select>
        <label for="workflow-task">Related task <span>(optional)</span></label>
        <select id="workflow-task" v-model="workItemId">
          <option value="">No linked task</option>
          <option v-for="item in linkedTasks" :key="item.id" :value="item.id">{{ item.title }}</option>
        </select>
        <label for="workflow-focus">What should it explain? <span>(optional)</span></label>
        <textarea id="workflow-focus" v-model="focus" maxlength="2000" rows="2" placeholder="A concept or part of the source you want to understand" />
        <p v-if="formError" class="error" role="alert">{{ formError }}</p>
        <Button type="submit" :disabled="busy || !assistant?.configured || !sources.length">{{ busy ? 'Agent writing…' : 'Write guide' }} <ArrowRight :size="15" aria-hidden="true" /></Button>
      </form>
      <p v-if="!assistant?.configured" class="connection-note">OpenAI is not connected. <NuxtLink to="/connections">See connection details</NuxtLink>.</p>
      <p class="privacy-note">Only the selected personal source and your focus are sent to OpenAI. SI documents are excluded. Applying a draft updates your private notebook note, not the source file.</p>
    </section>
    <section v-else class="start-panel" aria-labelledby="repo-title">
      <div class="panel-intro"><h2 id="repo-title">Delegate a learning artifact</h2><p>A workstation agent reads one configured personal repository and writes a guide plus a documentation draft on its own reserved branch.</p></div>
      <form v-if="registeredProjects.length" class="run-form" @submit.prevent="queueJob">
        <label for="repo-project">Project</label>
        <select id="repo-project" v-model="repoProject"><option v-for="name in registeredProjects" :key="name" :value="name">{{ name }}</option></select>
        <label for="repo-provider">Agent</label>
        <select id="repo-provider" v-model="jobProvider"><option v-for="provider in jobProviders" :key="provider" :value="provider">{{ provider === 'claude' ? 'Claude Code' : 'Codex · ChatGPT' }}</option></select>
        <label for="repo-task">Related task <span>(optional)</span></label>
        <select id="repo-task" v-model="jobWorkItemId"><option value="">No linked task</option><option v-for="item in repoTasks" :key="item.id" :value="item.id">{{ item.title }}</option></select>
        <label for="repo-title-input">Artifact title</label>
        <input id="repo-title-input" v-model="jobTitle" maxlength="200" placeholder="What should you understand?" required>
        <label for="repo-brief">Brief for the agent</label>
        <textarea id="repo-brief" v-model="jobBrief" maxlength="8000" rows="4" placeholder="Name the feature, code path, or question to explain" required />
        <Button type="submit" :disabled="jobBusy">{{ jobBusy ? 'Adding to queue…' : 'Queue agent job' }} <ArrowRight :size="15" aria-hidden="true" /></Button>
      </form>
      <p v-else class="connection-note">No personal repository runner is registered. Configure and start the workstation runner before queueing a job.</p>
      <p v-if="registeredProjects.length && !runnerOnline" class="connection-note">The runner is offline. This job will wait in the queue until it returns.</p>
      <p class="privacy-note">The runner is limited to its configured personal repositories. The two Markdown files are committed on an isolated branch for review; Kimo never merges them automatically.</p>
    </section>

    <p v-if="loadError" class="state error" role="alert">Workflows could not be loaded. Use Refresh to try again.</p>
    <p v-else-if="status === 'pending'" class="state">Loading projects…</p>
    <p v-else-if="!grouped.length" class="state">No projects yet. Add a task in <NuxtLink to="/work">Work</NuxtLink> or start a guide above.</p>
    <p v-if="actionError || jobError" class="error" role="alert">{{ actionError || jobError }}</p>
    <section v-for="group in grouped" :key="group.name" class="project-section" :aria-label="group.name">
      <div class="project-head"><div><h2>{{ group.name }}</h2><p>{{ group.tasks.length }} work item{{ group.tasks.length === 1 ? '' : 's' }} · {{ group.jobs.length }} agent job{{ group.jobs.length === 1 ? '' : 's' }} · {{ group.runs.length }} source guide{{ group.runs.length === 1 ? '' : 's' }}</p></div><NuxtLink to="/work">Open work queue <ArrowRight :size="14" aria-hidden="true" /></NuxtLink></div>
      <div v-if="group.tasks.length" class="task-strip"><span class="strip-label">Work</span><ul><li v-for="task in group.tasks" :key="task.id"><span>{{ task.title }}</span><small>{{ task.status }}</small></li></ul></div>
      <div v-if="!group.runs.length && !group.jobs.length" class="no-runs">No agent work for this project yet.</div>
      <div v-if="group.jobs.length" class="job-group">
        <h3>Repository agent</h3>
        <ul class="run-list"><li v-for="job in group.jobs" :key="job.id" class="run-row">
          <div class="run-heading"><div><strong>{{ job.title }}</strong><span>{{ date(job.createdAt) }} · {{ job.status === 'running' ? (job.provider === 'claude' ? 'Claude' : 'Codex') + ' is writing in a reserved worktree' : job.status === 'queued' ? 'Waiting for runner' : job.status === 'ready' ? 'Guide and documentation draft ready' : job.status === 'cancelled' ? 'Stopped' : 'Needs attention' }}</span></div><span class="run-status" :class="job.status">{{ job.cancelRequested ? 'Stopping' : job.status === 'ready' ? job.readAt ? 'Read' : 'Unread' : job.status }}</span></div>
          <p v-if="job.error" class="error">{{ job.error }}</p>
          <div class="job-actions"><NuxtLink :to="'/agent-jobs/' + job.id" class="result-link"><Workflow :size="16" aria-hidden="true" /> {{ job.status === 'ready' ? 'Read artifact' : 'View job' }} <ArrowRight :size="14" aria-hidden="true" /></NuxtLink><Button v-if="job.status === 'queued' || (job.status === 'running' && !job.cancelRequested)" variant="outline" size="sm" :disabled="!!changingJob" @click="cancelJob(job)">{{ changingJob === job.id ? 'Stopping…' : 'Stop job' }}</Button></div>
        </li></ul>
      </div>
      <h3 v-if="group.runs.length" class="group-label">Source guides</h3>
      <ul v-if="group.runs.length" class="run-list">
        <li v-for="run in group.runs" :key="run.id" class="run-row">
          <div class="run-heading"><div><strong>{{ run.sourceTitle }}</strong><span>{{ run.focus || 'Central idea' }} · {{ date(run.createdAt) }}</span></div><span class="run-status" :class="run.status">{{ run.status === 'running' ? 'Writing' : run.status === 'failed' ? 'Needs retry' : run.documentedAt ? 'Documented' : 'Review note' }}</span></div>
          <p v-if="run.error" class="error">{{ run.error }}</p>
          <p v-if="run.workItemId" class="linked-task">Linked task: {{ group.tasks.find(item => item.id === run.workItemId)?.title || 'Former task' }}</p>
          <div v-if="run.status === 'failed'" class="run-actions"><Button variant="outline" size="sm" :disabled="!!activeRun" @click="act(run, 'retry')">{{ activeRun === run.id ? 'Retrying…' : 'Retry guide agent' }}</Button></div>
          <div v-if="run.status === 'ready'" class="result">
            <div class="guide-link"><NuxtLink v-if="run.artifactId" :to="'/briefs/' + run.artifactId" class="result-link"><BookOpenText :size="16" aria-hidden="true" /> Open guide <ArrowRight :size="14" aria-hidden="true" /></NuxtLink><span>{{ run.artifactReadAt ? 'Read' : 'Unread' }}</span></div>
            <div v-if="!run.documentedAt" class="note-review"><label :for="'draft-' + run.id"><FilePenLine :size="16" aria-hidden="true" /> Documentation note draft</label><textarea :id="'draft-' + run.id" v-model="drafts[run.id]" maxlength="12000" rows="6" /><div class="note-action"><span>Review the AI text before adding it to your private note for this source.</span><Button variant="outline" size="sm" :disabled="!!activeRun" @click="act(run, 'document')">{{ activeRun === run.id ? 'Saving…' : 'Add to note' }}</Button></div></div>
            <p v-else class="documented"><NuxtLink :to="run.sourcePath">Open source and note <ArrowRight :size="14" aria-hidden="true" /></NuxtLink> · Added {{ date(run.documentedAt) }}</p>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
.orchestrator{max-width:70rem}.page-head,.project-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}.page-head{margin-bottom:2rem}.page-head h1{font:600 clamp(1.9rem,4vw,2.8rem)/1.15 var(--font-ui);letter-spacing:-.025em;margin:0 0 .35rem;overflow-wrap:anywhere}.page-head p,.panel-intro p{color:var(--muted);margin:0;max-width:62ch}.page-head button{flex:none}.start-panel{background:var(--panel);border:1px solid var(--border);border-radius:.85rem;padding:1.35rem;margin-bottom:2.25rem}.panel-intro h2{font:600 1.15rem var(--font-ui);margin:0 0 .25rem}.panel-intro p{font-size:.86rem}.run-form{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.45rem 1rem;align-items:end;margin-top:1rem}.run-form label{font-size:.78rem;font-weight:700;margin-top:.55rem}.run-form label span{font-weight:400;color:var(--muted)}.run-form input,.run-form select,.run-form textarea,.note-review textarea{width:100%;min-width:0;border:1px solid var(--border);border-radius:.5rem;background:var(--bg);color:var(--text);font:inherit;font-size:.86rem;padding:.65rem .7rem}.run-form textarea{resize:vertical}.run-form button{justify-self:start;grid-column:1 / -1;margin-top:.55rem}.run-form .error{grid-column:1 / -1;margin:0}.privacy-note,.connection-note{color:var(--muted);font-size:.78rem;margin:1rem 0 0;max-width:75ch}.connection-note{color:var(--serious)}.project-section{margin:0 0 2.4rem}.project-head{border-bottom:1px solid var(--border);padding-bottom:.65rem}.project-head h2{font:600 1.3rem var(--font-ui);margin:0;overflow-wrap:anywhere}.project-head p{color:var(--muted);font-size:.76rem;margin:.15rem 0 0}.project-head a,.result-link,.documented a{display:inline-flex;align-items:center;gap:.3rem;font-size:.8rem}.task-strip{display:grid;grid-template-columns:5rem minmax(0,1fr);gap:1rem;padding:.85rem 0;border-bottom:1px solid var(--border)}.strip-label{font-size:.75rem;font-weight:700;color:var(--muted)}.task-strip ul,.run-list{list-style:none;margin:0;padding:0}.task-strip li{display:flex;justify-content:space-between;gap:1rem;font-size:.82rem;padding:.15rem 0}.task-strip li span{min-width:0;overflow-wrap:anywhere}.task-strip small{text-transform:capitalize;color:var(--muted);white-space:nowrap}.run-row{padding:1.05rem 0;border-bottom:1px solid var(--border)}.run-heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.run-heading strong,.run-heading span{display:block}.run-heading strong{font-size:.92rem;overflow-wrap:anywhere}.run-heading div>span,.linked-task{font-size:.78rem;color:var(--muted);margin-top:.2rem}.run-status{flex:none;font-size:.72rem;font-weight:700;color:var(--accent)}.run-status.failed{color:var(--critical)}.run-status.running{color:var(--serious)}.result{margin-top:.7rem}.note-review{margin-top:1rem;max-width:48rem}.note-review label{display:flex;gap:.4rem;align-items:center;font-size:.78rem;font-weight:700;margin-bottom:.4rem}.note-review textarea{min-height:8rem;line-height:1.5;resize:vertical}.note-action{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:.5rem}.note-action span,.documented,.no-runs{font-size:.78rem;color:var(--muted)}.no-runs{padding:1rem 0}.run-actions{margin-top:.5rem}.error{color:var(--critical);font-size:.82rem}.state{padding:1.25rem;background:var(--panel);border-radius:.65rem;color:var(--muted)}.run-form :is(input,select,textarea):focus-visible,.note-review textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}@media(max-width:42rem){.page-head,.project-head{flex-wrap:wrap}.page-head{margin-bottom:1.3rem}.start-panel{padding:1rem}.run-form{grid-template-columns:minmax(0,1fr)}.task-strip{grid-template-columns:minmax(0,1fr);gap:.3rem}.note-action{align-items:stretch;flex-direction:column}.note-action button{align-self:flex-start}}
.guide-link{display:flex;align-items:center;gap:.65rem}.guide-link span{font-size:.72rem;color:var(--muted);font-weight:700}
.run-form{grid-template-columns:12rem minmax(0,1fr);max-width:48rem}.project-head a,.result-link,.documented a{min-height:44px}@media(max-width:42rem){.run-form{grid-template-columns:minmax(0,1fr)}}
.mode-switch{display:flex;gap:.2rem;margin:0 0 .7rem;border-bottom:1px solid var(--border)}.mode-switch button{min-height:44px;padding:.55rem .8rem;background:none;border:0;border-bottom:2px solid transparent;color:var(--muted);font:600 .83rem var(--font-ui);cursor:pointer}.mode-switch button.chosen{color:var(--accent);border-bottom-color:var(--accent)}.mode-switch button:hover{color:var(--text)}.job-group{padding-top:.8rem}.job-group h3,.group-label{font:700 .78rem var(--font-ui);color:var(--muted);margin:0;padding:.3rem 0;text-transform:none}.group-label{padding-top:1rem}.job-actions{display:flex;align-items:center;flex-wrap:wrap;gap:.75rem;margin-top:.5rem}.run-status.queued{color:var(--muted)}.run-status.failed{color:var(--critical)}.run-status.cancelled{color:var(--muted)}.run-status.ready{color:var(--accent)}.run-status.running{color:var(--serious)}@media(max-width:25rem){.mode-switch button{font-size:.76rem;padding:.45rem .55rem}}
</style>
