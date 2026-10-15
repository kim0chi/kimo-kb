<script setup lang="ts">
import { RefreshCw, ArrowUpRight, Check } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Project, ProjectArtifact } from '~~/lib/projects'
import type { WorkItem, WorkStatus } from '~~/server/utils/work-items'
import type { ReadingItem } from '~~/lib/reading'

useHead({ title: 'Projects — Kimo' })
const route = useRoute(), router = useRouter()
const request = useRequestFetch()
const { data: all, error: projectsError, refresh: refreshProjects } = await useFetch<{ projects: Project[] }>('/api/projects')
const projectId = computed(() => String(route.query.project || 'si'))
const { data, status, error, refresh } = await useFetch<{ project: Project; tasks: WorkItem[]; artifacts: (Omit<ProjectArtifact,'content'> & {preview:string})[] }>(() => '/api/projects/' + encodeURIComponent(projectId.value))
const { data: reading, refresh: refreshReading } = await useFetch<{items:ReadingItem[]}>('/api/reading', { key: 'reading-inbox' })
const statusVersion = ref('')
const taskId = ref(''), filter = ref('all'), search = ref(''), mobileView = ref(typeof route.query.artifact === 'string' ? 'read' : 'queue')
const artifact = ref<(ProjectArtifact & {history:{revision:number;title:string;author:string;createdAt:string}[]}) | null>(null)
const historical = ref<{revision:number;title:string;content:string;author:string;createdAt:string} | null>(null)
const loadingArtifact = ref(false), saving = ref(false), failure = ref(''), title = ref(''), note = ref(''), editingStatus = ref<WorkStatus>('queued')
const task = computed(() => data.value?.tasks.find(item => item.id === taskId.value))
const queue = computed(() => (data.value?.tasks || []).filter(item => item.status !== 'archived' && item.status !== 'done'))
const visible = computed(() => (data.value?.artifacts || []).filter(item =>
  (!taskId.value || item.taskId === taskId.value) && (filter.value === 'all' || item.kind === filter.value) &&
  (!search.value || (item.title + ' ' + item.preview).toLowerCase().includes(search.value.toLowerCase()))))
const oldGuides = computed(() => (reading.value?.items || []).filter(item => item.project.toLowerCase() === data.value?.project.name.toLowerCase() && item.id.startsWith('job:')))
const hasUpdate = computed(() => artifact.value && (data.value?.artifacts.find(item => item.id === artifact.value!.id)?.revision || 0) > artifact.value.revision)
const displayed = computed(() => historical.value || artifact.value)
const date = (value:string) => new Intl.DateTimeFormat('en-SG',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Singapore'}).format(new Date(value))
function message(cause: any) { return cause?.data?.statusMessage || 'Kimo could not save this change. Your draft is still here; try again.' }
let loadGeneration = 0
async function openArtifact(id: string) {
  const generation = ++loadGeneration, project = projectId.value
  loadingArtifact.value = true; failure.value = ''; historical.value = null
  try {
    const result = await request<typeof artifact.value>('/api/projects/' + project + '/artifacts/' + encodeURIComponent(id))
    if (generation !== loadGeneration || projectId.value !== project) return
    artifact.value = result; mobileView.value = 'read'
    const linked = data.value?.tasks.find(item => item.id === result?.taskId)
    if (linked) { taskId.value = linked.id; note.value = linked.note; editingStatus.value = linked.status; statusVersion.value = linked.updatedAt }
    await router.replace({ query: { ...route.query, project, artifact: id } })
  } catch(cause) { if (generation === loadGeneration) failure.value = message(cause) }
  finally { if (generation === loadGeneration) loadingArtifact.value = false }
}
async function chooseProject(id: string) {
  ++loadGeneration; artifact.value = null; historical.value = null; taskId.value = ''; failure.value = ''; search.value = ''; mobileView.value = 'queue'
  await router.push({ query: { project: id } })
}
function chooseTask(item?: WorkItem) {
  taskId.value = item?.id || ''; note.value = item?.note || ''; editingStatus.value = item?.status || 'queued'; statusVersion.value = item?.updatedAt || ''
  const explanation = data.value?.artifacts.find(a => a.taskId === item?.id && a.kind === 'explanation')
  if (explanation) void openArtifact(explanation.id)
  else { ++loadGeneration; artifact.value = null; historical.value = null; loadingArtifact.value = false; void router.replace({ query: { project: projectId.value } }) }
}
async function addTask() {
  if (!title.value.trim() || saving.value) return
  saving.value = true; failure.value = ''
  try { const saved = await $fetch<WorkItem>('/api/projects/' + projectId.value + '/tasks', { method: 'POST', body: { title: title.value, status: 'queued' } }); title.value = ''; await refresh(); chooseTask(saved) }
  catch(cause) { failure.value = message(cause) } finally { saving.value = false }
}
async function saveStatus() {
  if (!task.value || saving.value) return
  saving.value = true; failure.value = ''
  try { await $fetch('/api/projects/' + projectId.value + '/tasks', { method: 'POST', body: { id: task.value.id, expectedUpdatedAt: statusVersion.value, status: editingStatus.value, note: note.value } }); await refresh(); if (task.value) chooseTask(task.value) }
  catch(cause) { failure.value = message(cause) } finally { saving.value = false }
}
async function markRead() {
  if (!artifact.value || saving.value || historical.value) return
  saving.value = true; failure.value = ''
  try {
    const result = await $fetch<ProjectArtifact>('/api/projects/' + projectId.value + '/artifacts/' + artifact.value.id + '/read', { method: 'POST', body: { revision: artifact.value.revision, read: !artifact.value.readAt } })
    // Keep the visible text stable if another revision arrived while reading.
    artifact.value.readRevision = result.readRevision
    artifact.value.readAt = result.readRevision >= artifact.value.revision ? result.readAt || new Date().toISOString() : null
    await Promise.all([refresh(), refreshReading()])
  } catch(cause) { failure.value = message(cause) } finally { saving.value = false }
}
async function showRevision(event: Event) {
  const revision = Number((event.target as HTMLSelectElement).value)
  if (!artifact.value) return
  if (revision === artifact.value.revision) { historical.value = null; return }
  try { historical.value = await $fetch('/api/projects/' + projectId.value + '/artifacts/' + artifact.value.id + '?revision=' + revision) }
  catch(cause) { failure.value = message(cause) }
}
watch(projectId, () => {
  ++loadGeneration; artifact.value = null; historical.value = null; taskId.value = ''; mobileView.value = typeof route.query.artifact === 'string' ? 'read' : 'queue'; failure.value = ''
  if (typeof route.query.artifact === 'string') void openArtifact(route.query.artifact)
})
watch(() => route.query.artifact, id => {
  if (typeof id === 'string' && artifact.value?.id !== id) void openArtifact(id)
  else if (!id) { ++loadGeneration; artifact.value = null; historical.value = null; loadingArtifact.value = false }
})
if (typeof route.query.artifact === 'string') await openArtifact(route.query.artifact)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => { if (!document.hidden && !saving.value) void refresh() }, 15000) })
onBeforeUnmount(() => { ++loadGeneration; if (timer) clearInterval(timer) })
</script>

<template>
  <div class="projects-page">
    <header class="page-head"><div><h1>Projects</h1><p>Keep the work and the explanation together.</p></div><Button variant="outline" :disabled="status === 'pending'" @click="refresh()"><RefreshCw :size="15" aria-hidden="true" /> Refresh</Button></header>
    <p v-if="projectsError" role="alert">Projects could not be loaded. <Button variant="outline" @click="refreshProjects()">Retry</Button></p>
    <nav class="project-tabs" aria-label="Projects"><button v-for="project in all?.projects" :key="project.id" type="button" :aria-current="projectId === project.id ? 'page' : undefined" @click="chooseProject(project.id)">{{ project.name }}</button></nav>
    <p v-if="failure" class="error" role="alert">{{ failure }}</p>
    <p v-if="error" class="error" role="alert">This project could not be loaded. <Button variant="outline" @click="refresh()">Retry</Button></p>
    <p v-else-if="!data" class="muted">Loading project…</p>
    <template v-else>
      <div class="mobile-views" aria-label="Workspace view"><Button :variant="mobileView === 'queue' ? 'default' : 'outline'" @click="mobileView = 'queue'">Queue &amp; status</Button><Button :variant="mobileView === 'read' ? 'default' : 'outline'" @click="mobileView = 'read'">Read &amp; context</Button></div>
      <div class="workspace">
        <aside class="work-panel" :class="{ 'mobile-hidden': mobileView !== 'queue' }">
          <div class="section-head"><h2>Work queue</h2><NuxtLink to="/work">All work <ArrowUpRight :size="14" aria-hidden="true" /></NuxtLink></div>
          <form class="task-form" @submit.prevent="addTask"><label for="new-task">Next action</label><div><Input id="new-task" v-model="title" placeholder="Add one task" maxlength="200" :disabled="saving" /><Button type="submit" :disabled="saving || !title.trim()">Add</Button></div></form>
          <p v-if="!queue.length" class="muted">No open tasks. Add a next action, or let your agent publish one.</p>
          <ul class="queue"><li v-for="item in queue" :key="item.id"><button type="button" :class="{ chosen: taskId === item.id }" @click="chooseTask(item)"><strong>{{ item.title }}</strong><span>{{ item.status }}</span></button></li></ul>
          <details v-if="data.tasks.some(t => t.status === 'done')"><summary>Completed tasks</summary><button v-for="item in data.tasks.filter(t => t.status === 'done')" :key="item.id" type="button" class="completed" @click="chooseTask(item)">{{ item.title }}</button></details>
          <section class="status-panel" aria-labelledby="status-title"><h2 id="status-title">Current status</h2><template v-if="task"><h3>{{ task.title }}</h3><form @submit.prevent="saveStatus"><label for="task-status">Status</label><select id="task-status" v-model="editingStatus"><option value="queued">Queued</option><option value="active">Active</option><option value="waiting">Waiting</option><option value="done">Done</option><option value="archived">Archived</option></select><label for="task-note">Handoff</label><Textarea id="task-note" v-model="note" rows="5" maxlength="12000" placeholder="What changed, checks, blockers, next step" /><small>Updated {{ date(task.updatedAt) }}</small><Button type="submit" variant="outline" :disabled="saving">Save status</Button></form></template><p v-else class="muted">Select a task to see its progress and handoff.</p></section>
        </aside>
        <div class="reading-panel" :class="{ 'mobile-hidden': mobileView !== 'read', 'has-artifact': !!artifact }">
          <section aria-labelledby="saved-heading"><div class="section-head"><h2 id="saved-heading">{{ task ? 'Saved for this task' : 'Project memory' }}</h2><Button v-if="taskId" variant="ghost" @click="chooseTask()">All project items</Button></div><div class="artifact-filters"><label class="sr-only" for="artifact-kind">Artifact type</label><select id="artifact-kind" v-model="filter"><option value="all">All types</option><option value="explanation">Explanations</option><option value="context">Context</option><option value="learning">Learning</option><option value="documentation">Documentation</option><option value="decision">Decisions</option></select><label class="sr-only" for="artifact-search">Find saved items</label><Input id="artifact-search" v-model="search" placeholder="Find by title" type="search" /></div>
            <ul v-if="visible.length" class="artifact-list"><li v-for="item in visible" :key="item.id"><button type="button" :class="{ chosen: artifact?.id === item.id }" @click="openArtifact(item.id)"><span><strong>{{ item.title }}</strong><small>{{ item.kind }} · {{ date(item.updatedAt) }}</small></span><span class="read-state">{{ item.readAt ? 'Read' : item.readRevision ? 'Updated' : 'Unread' }}</span></button></li></ul>
            <p v-else class="muted">{{ search || filter !== 'all' ? 'No items match. Change the search or type.' : task ? 'No artifacts linked to this task yet.' : 'Your agent’s explanations, decisions and context will appear here.' }}</p>
            <div v-if="!taskId && oldGuides.length && (filter === 'all' || filter === 'learning')" class="existing-guides"><h3>Repository learning</h3><NuxtLink v-for="guide in oldGuides" :key="guide.id" :to="guide.href">{{ guide.title }} <span>{{ guide.readAt ? 'Read' : 'Unread' }}</span></NuxtLink></div>
          </section>
          <article class="reader" aria-labelledby="artifact-title" :aria-busy="loadingArtifact">
            <p v-if="loadingArtifact" class="muted" role="status">Opening artifact…</p>
            <template v-else-if="artifact && displayed"><div v-if="hasUpdate" class="update-notice" role="status"><span>A newer explanation is available.</span><Button variant="outline" @click="openArtifact(artifact.id)">Read update</Button></div><header><h2 id="artifact-title">{{ displayed.title }}</h2><p class="muted">{{ artifact.kind }} · {{ displayed.author }} · Revision {{ displayed.revision }}</p><div class="reader-actions"><Button :disabled="saving || !!historical" @click="markRead"><Check :size="15" aria-hidden="true" /> {{ historical ? 'Earlier revision' : artifact.readAt ? 'Mark unread' : 'Mark read' }}</Button><a v-if="artifact.sourceUrl" :href="artifact.sourceUrl" target="_blank" rel="noopener noreferrer">Source <ArrowUpRight :size="14" aria-hidden="true" /></a><label v-if="artifact.history.length > 1">History <select :value="displayed.revision" @change="showRevision"><option v-for="entry in artifact.history" :key="entry.revision" :value="entry.revision">Revision {{ entry.revision }}</option></select></label></div></header><ArtifactText :content="displayed.content" /></template>
            <div v-else class="reader-empty"><h2 id="artifact-title">A place to understand the work</h2><p>Open an explanation above. Your agent can keep it up to date while you work in VS Code.</p><p class="muted">Reading is yours to mark. Updates keep the earlier versions.</p></div>
          </article>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.projects-page{max-width:74rem;min-width:0}.page-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.6rem}.page-head h1{font:600 2.2rem/1.2 var(--font-ui);letter-spacing:-.025em;margin:0}.page-head p{color:var(--muted);margin:.4rem 0 0}.project-tabs{display:flex;gap:1.5rem;border-bottom:1px solid var(--border);margin-bottom:1.8rem;overflow-x:auto}.project-tabs button{border:0;border-bottom:2px solid transparent;background:none;padding:.8rem .25rem;min-height:44px;color:var(--muted);font:600 1rem var(--font-ui);cursor:pointer}.project-tabs button[aria-current]{color:var(--accent);border-bottom-color:var(--accent)}.project-tabs button:hover{color:var(--text)}.workspace{display:grid;grid-template-columns:minmax(15rem,.85fr) minmax(0,1.8fr);gap:2rem}.work-panel{min-width:0}.reading-panel{display:flex;flex-direction:column;min-width:0;border-left:1px solid var(--border);padding-left:2rem}h2{font:600 1.1rem/1.35 var(--font-ui);margin:0}h3{font:600 .95rem/1.4 var(--font-ui);margin:1rem 0 .5rem}.section-head{display:flex;align-items:center;justify-content:space-between;gap:.7rem;margin-bottom:1rem}.section-head a,.reader-actions a{display:inline-flex;align-items:center;gap:.2rem;font-size:.8rem}.muted{color:var(--muted);line-height:1.6;font-size:.88rem}.task-form label,.status-panel label{display:block;font-size:.8rem;font-weight:600;margin-bottom:.4rem}.task-form>div{display:flex;gap:.5rem}.task-form input{min-width:0}.queue,.artifact-list{list-style:none;padding:0;margin:1rem 0}.queue li,.artifact-list li{border-bottom:1px solid var(--border)}.queue button,.artifact-list button{display:flex;justify-content:space-between;align-items:flex-start;gap:.8rem;text-align:left;width:100%;background:none;color:var(--text);border:0;border-radius:5px;padding:.85rem .5rem;min-height:44px;cursor:pointer;font:inherit}.queue button:hover,.artifact-list button:hover,.chosen{background:var(--accent-soft)!important}.queue strong,.artifact-list strong{font-size:.88rem;line-height:1.45;overflow-wrap:anywhere}.queue span,.read-state{font-size:.73rem;color:var(--muted);flex:none;text-transform:capitalize}.artifact-list small{display:block;color:var(--muted);font-size:.75rem;margin-top:.2rem}.read-state{color:var(--accent)}.status-panel{border-top:1px solid var(--border);margin-top:2rem;padding-top:1.4rem}.status-panel h3{margin:.8rem 0}.status-panel select{width:100%;margin-bottom:1rem}.status-panel small{display:block;color:var(--muted);font-size:.75rem;margin:.6rem 0 1rem}.artifact-filters{display:flex;gap:.5rem}.artifact-filters input{min-width:0}select{background:var(--panel);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:.5rem;min-height:44px;font:inherit;font-size:.8rem;max-width:100%}.has-artifact .reader{order:-1;margin-top:0;padding-top:0;border-top:0}.has-artifact>section{margin-top:2rem;border-top:1px solid var(--border);padding-top:1.5rem}.projects-page :deep(button),.projects-page :deep(input){min-height:44px}.reader{border-top:1px solid var(--border);padding-top:1.8rem;margin-top:2rem;min-width:0}.reader header{margin-bottom:2rem}.reader h2{font:600 clamp(1.4rem,2.6vw,2rem)/1.25 var(--font-ui);letter-spacing:-.02em;overflow-wrap:anywhere}.reader-actions{display:flex;align-items:center;gap:1rem;flex-wrap:wrap}.reader-actions label{font-size:.78rem;color:var(--muted);display:flex;align-items:center;gap:.5rem}.reader-empty{padding:1rem 0 3rem;max-width:50ch}.reader-empty p{font-size:.9rem;line-height:1.7}.update-notice{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem;background:var(--accent-soft);border-radius:8px;margin-bottom:1.5rem;font-size:.85rem}.existing-guides a{display:block;border-bottom:1px solid var(--border);padding:.7rem 0;min-height:44px;font-size:.85rem}.existing-guides span{font-size:.73rem;color:var(--muted);margin-left:.5rem}.error{color:var(--critical);font-size:.9rem}.mobile-views{display:none}details{font-size:.85rem}summary{cursor:pointer;min-height:44px;padding:.7rem 0}.completed{background:none;border:0;color:var(--text);text-align:left;display:block;min-height:44px;padding:.5rem;font:inherit;width:100%}@media(max-width:48rem){.workspace{grid-template-columns:1fr;gap:1.5rem}.reading-panel{border-left:0;padding-left:0}.mobile-views{display:flex;gap:.5rem;margin-bottom:1.4rem}.mobile-views button{flex:1}.mobile-hidden{display:none}.page-head{align-items:flex-start}.page-head h1{font-size:1.9rem}.page-head p{font-size:.85rem}.project-tabs{margin-bottom:1.2rem}.update-notice{align-items:flex-start;flex-direction:column}.reader{margin-top:1.5rem}.artifact-filters{flex-wrap:wrap}.artifact-filters input{flex:1;min-width:10rem}}
</style>
