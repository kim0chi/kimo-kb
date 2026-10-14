<script setup lang="ts">
import { PenLine } from '@lucide/vue'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'

const emit = defineEmits<{ saved: [] }>()
const open = ref(false)
const busy = ref(false)
const error = ref('')
const concept = ref('')
const understanding = ref('')
const question = ref('')
const sourceUrl = ref('')

async function save() {
  if (!concept.value.trim() || !understanding.value.trim()) { error.value = 'Name the concept and explain it in your own words.'; return }
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/journal', { method: 'POST', body: { concept: concept.value, understanding: understanding.value, question: question.value, sourceUrl: sourceUrl.value } })
    concept.value = ''; understanding.value = ''; question.value = ''; sourceUrl.value = ''
    emit('saved')
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
    <SheetTrigger as-child><Button variant="outline" class="learning-trigger"><PenLine :size="16" aria-hidden="true" /> Record a learning</Button></SheetTrigger>
    <SheetContent side="right" class="w-full sm:max-w-lg">
      <SheetHeader><SheetTitle>What clicked today?</SheetTitle><SheetDescription>Explain one idea in your own words. Return to it when you need it.</SheetDescription></SheetHeader>
      <form class="learning-form" @submit.prevent="save">
        <label for="concept">Concept or lesson <span aria-hidden="true">*</span></label>
        <Input id="concept" v-model="concept" maxlength="200" placeholder="e.g. Why the request passes through a queue" required />
        <label for="understanding">My explanation <span aria-hidden="true">*</span></label>
        <Textarea id="understanding" v-model="understanding" rows="7" maxlength="10000" placeholder="How does it work? What would you tell a teammate?" required />
        <label for="question">What is still unclear? <span class="optional">optional</span></label>
        <Textarea id="question" v-model="question" rows="3" maxlength="3000" placeholder="A question to revisit" />
        <label for="learning-source">Source link <span class="optional">optional</span></label>
        <Input id="learning-source" v-model="sourceUrl" type="url" placeholder="https://..." />
        <p v-if="error" role="alert" class="form-error">{{ error }}</p>
        <Button type="submit" :disabled="busy" class="save-button">{{ busy ? 'Saving…' : 'Save learning' }}</Button>
      </form>
    </SheetContent>
  </Sheet>
</template>

<style scoped>
.learning-trigger { display: inline-flex; align-items: center; gap: .45rem; }
.learning-form { display: flex; flex: 1; min-height: 0; flex-direction: column; gap: .55rem; padding: 1.3rem 1.5rem 2rem; overflow-y: auto; }
.learning-form label { font-size: .78rem; font-weight: 700; margin-top: .5rem; }
.optional { color: var(--muted); font-weight: 400; }
.form-error { color: var(--critical); font-size: .85rem; }
.save-button { margin-top: 1rem; }
</style>
