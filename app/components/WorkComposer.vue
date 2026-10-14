<script setup lang="ts">
import { Plus, Pencil } from '@lucide/vue'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'
import type { WorkItem, WorkKind, WorkStatus } from '~~/server/utils/work-items'

const props = defineProps<{ kind?: WorkKind; item?: WorkItem; label?: string }>()
const emit = defineEmits<{ saved: [item: WorkItem] }>()
const open = ref(false)
const busy = ref(false)
const error = ref('')
const title = ref('')
const kind = ref<WorkKind>('task')
const status = ref<WorkStatus>('queued')
const project = ref('')
const note = ref('')
const sourceUrl = ref('')

function reset() {
  title.value = props.item?.title ?? ''
  kind.value = props.item?.kind ?? props.kind ?? 'task'
  status.value = props.item?.status ?? 'queued'
  project.value = props.item?.project ?? ''
  note.value = props.item?.note ?? ''
  sourceUrl.value = props.item?.sourceUrl ?? ''
  error.value = ''
}
watch(open, (value) => { if (value) reset() })
watch(kind, (value) => {
  if (value === 'idea' && ['active', 'waiting', 'done'].includes(status.value)) status.value = 'queued'
})

async function save() {
  if (!title.value.trim()) { error.value = 'Give it a short title.'; return }
  busy.value = true
  error.value = ''
  try {
    const item = await $fetch<WorkItem>(props.item ? '/api/work-items/' + props.item.id : '/api/work-items', {
      method: props.item ? 'PATCH' : 'POST',
      body: { title: title.value, kind: kind.value, status: status.value, project: project.value, note: note.value, sourceUrl: sourceUrl.value },
    })
    emit('saved', item)
    open.value = false
  } catch (cause) {
    const failure = cause as { data?: { statusMessage?: string }; message?: string }
    error.value = failure.data?.statusMessage || failure.message || 'Could not save. Try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetTrigger as-child>
      <Button :variant="item ? 'outline' : 'default'" :size="item ? 'sm' : 'default'" class="composer-trigger">
        <Pencil v-if="item" :size="15" aria-hidden="true" />
        <Plus v-else :size="16" aria-hidden="true" />
        {{ label ?? (item ? 'Edit' : kind === 'idea' ? 'Capture idea' : kind === 'design' ? 'Start a practice' : 'Add task') }}
      </Button>
    </SheetTrigger>
    <SheetContent side="right" class="w-full sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>{{ item ? 'Edit item' : kind === 'idea' ? 'Capture an idea' : kind === 'design' ? 'Design practice' : 'Add a task' }}</SheetTitle>
        <SheetDescription>Keep enough context to pick this up later. A captured idea has no deadline.</SheetDescription>
      </SheetHeader>
      <form class="composer-form" @submit.prevent="save">
        <label for="item-title">Title <span aria-hidden="true">*</span></label>
        <Input id="item-title" v-model="title" maxlength="200" placeholder="What is the next meaningful thing?" required autofocus />
        <label for="item-kind">Type</label>
        <select id="item-kind" v-model="kind"><option value="task">Task</option><option value="idea">Idea</option><option value="design">Design practice</option></select>
        <label for="item-status">Status</label>
        <select id="item-status" v-model="status">
          <option value="queued">Queued</option>
          <option v-if="kind !== 'idea'" value="active">Active</option>
          <option v-if="kind !== 'idea'" value="waiting">Waiting</option>
          <option v-if="kind !== 'idea'" value="done">Done</option>
          <option value="archived">Archived</option>
        </select>
        <label for="item-project">Project <span class="optional">optional</span></label>
        <Input id="item-project" v-model="project" maxlength="120" placeholder="e.g. Kimo or RE-4888" />
        <label for="item-note">Notes <span class="optional">optional</span></label>
        <Textarea id="item-note" v-model="note" maxlength="12000" rows="5" placeholder="What matters, what you tried, or what to revisit" />
        <label for="item-source">Source link <span class="optional">optional</span></label>
        <Input id="item-source" v-model="sourceUrl" type="url" placeholder="https://..." />
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <Button type="submit" :disabled="busy" class="save-button">{{ busy ? 'Saving…' : item ? 'Save changes' : 'Save item' }}</Button>
      </form>
    </SheetContent>
  </Sheet>
</template>

<style scoped>
.composer-trigger { display: inline-flex; gap: .45rem; align-items: center; }
.composer-form { display: flex; flex: 1; min-height: 0; flex-direction: column; gap: .5rem; padding: 1.3rem 1.5rem 2rem; overflow-y: auto; }
.composer-form label { margin-top: .55rem; font-size: .78rem; font-weight: 700; color: var(--text); }
.optional { color: var(--muted); font-weight: 400; }
.composer-form select { width: 100%; min-height: 2.3rem; padding: .45rem .7rem; border-radius: .55rem; border: 1px solid var(--border); background: var(--panel); color: var(--text); font: inherit; font-size: .88rem; }
.form-error { margin: .5rem 0 0; color: var(--critical); font-size: .85rem; }
.save-button { margin-top: 1rem; width: 100%; }
</style>
