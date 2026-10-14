<script setup lang="ts">
import { ArrowUpRight, BookOpenText, Send, ShieldCheck } from '@lucide/vue'
useHead({ title: 'Ask a source — Kimo' })
type Source = { path: string; title: string; notebook: string }
type Status = { configured: boolean; model: string; sources: Source[] }
type Answer = { answer: string; source: Source }
const route = useRoute()
const { data: status, error: statusError } = await useFetch<Status>('/api/assistant/status')
const selected = ref(typeof route.query.source === 'string' ? route.query.source : '')
const question = ref('')
const answer = ref<Answer | null>(null)
const pending = ref(false)
const error = ref('')
const sources = computed(() => status.value?.sources || [])
watch(sources, list => {
  if (!list.some(item => item.path === selected.value)) selected.value = list[0]?.path || ''
}, { immediate: true })
watch(selected, () => { answer.value = null; error.value = '' })
async function ask() {
  if (!selected.value || !question.value.trim() || pending.value) return
  pending.value = true
  error.value = ''
  answer.value = null
  try {
    answer.value = await $fetch<Answer>('/api/assistant/ask', { method: 'POST', body: { path: selected.value, question: question.value } })
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || 'The assistant could not answer. Try again.'
  } finally { pending.value = false }
}
</script>

<template>
  <div class="ask-page">
    <p class="eyebrow">STUDY COMPANION</p>
    <h1>Ask a source</h1>
    <p class="lede">Pick one personal learning document. Ask what it means, how it works, or what you should practice next.</p>
    <div class="scope"><ShieldCheck :size="19" aria-hidden="true" /><p>Only the selected source excerpt and your question go to the OpenAI API when you press Ask. SI and external work documents are excluded. Answers are not saved automatically.</p></div>
    <p v-if="statusError" class="error" role="alert">Source status is unavailable. Reload this page.</p>
    <template v-else>
      <div class="field">
        <label for="source">Source document</label>
        <select id="source" v-model="selected" :disabled="!sources.length || pending">
          <option v-if="!sources.length" value="">No eligible sources</option>
          <option v-for="source in sources" :key="source.path" :value="source.path">{{ source.title }}</option>
        </select>
        <NuxtLink v-if="selected" :to="selected" class="source-link"><BookOpenText :size="15" aria-hidden="true" /> Read selected source <ArrowUpRight :size="14" aria-hidden="true" /></NuxtLink>
      </div>
      <form class="ask-form" @submit.prevent="ask">
        <label for="question">What do you want to understand?</label>
        <textarea id="question" v-model="question" :disabled="pending || !sources.length" maxlength="2000" rows="5" placeholder="Explain the central idea in simple terms, then give me a question to test whether I understood it." />
        <div class="form-bottom"><span>{{ question.length }} / 2,000</span><button type="submit" :disabled="pending || !selected || !question.trim() || !status?.configured"><Send :size="16" aria-hidden="true" /> {{ pending ? 'Thinking…' : 'Ask about this' }}</button></div>
      </form>
      <div v-if="!status?.configured" class="setup"><h2>Connect OpenAI to begin</h2><p>Add an API key to the server environment. Kimo keeps the key on the server and only allows the personal source scope shown above.</p><NuxtLink to="/connections">See connection status <ArrowUpRight :size="14" aria-hidden="true" /></NuxtLink></div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <section v-if="answer" class="answer" aria-live="polite"><p class="eyebrow">EXPLANATION</p><div class="answer-text">{{ answer.answer }}</div><footer>Source: <NuxtLink :to="answer.source.path">{{ answer.source.title }} <ArrowUpRight :size="13" aria-hidden="true" /></NuxtLink><p>Check the source for accuracy. Record your own explanation in the <NuxtLink to="/journal">learning journal</NuxtLink>.</p></footer></section>
    </template>
  </div>
</template>

<style scoped>
.ask-page{max-width:48rem}.eyebrow{color:var(--accent);font-size:.7rem;letter-spacing:.13em;font-weight:800}h1{font:600 clamp(2rem,4vw,3rem)/1.15 var(--font-serif);margin:.2rem 0 .55rem}.lede{color:var(--muted);line-height:1.6;max-width:42rem}.scope{display:flex;gap:.8rem;align-items:flex-start;background:var(--accent-soft);border-left:3px solid var(--accent);border-radius:.3rem;padding:1rem;margin:1.8rem 0}.scope svg{color:var(--accent);flex:none}.scope p{margin:0;color:var(--text);font-size:.84rem;line-height:1.55}.field,.ask-form{display:flex;flex-direction:column;gap:.55rem;margin:1.7rem 0}label{font-size:.85rem;font-weight:700}.field select,.ask-form textarea{width:100%;border:1px solid var(--border);border-radius:.6rem;background:var(--panel);color:var(--text);font:inherit;padding:.85rem;min-height:2.8rem}.ask-form textarea{resize:vertical;line-height:1.5}.field select:focus-visible,.ask-form textarea:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.source-link,.setup a,.answer a{display:inline-flex;align-items:center;gap:.25rem;color:var(--accent);font-size:.82rem}.form-bottom{display:flex;align-items:center;justify-content:space-between;gap:1rem;color:var(--muted);font-size:.75rem}.form-bottom button{display:inline-flex;align-items:center;gap:.5rem;border:0;border-radius:.5rem;background:var(--accent);color:var(--on-accent);padding:.7rem 1rem;font:700 .85rem var(--font-ui);cursor:pointer}.form-bottom button:disabled{opacity:.55;cursor:not-allowed}.setup,.answer{border:1px solid var(--border);border-radius:.8rem;background:var(--panel);padding:1.3rem;margin:2rem 0}.setup h2{font-size:1rem;margin:0 0 .4rem}.setup p{font-size:.86rem;color:var(--muted);line-height:1.5}.answer-text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65}.answer footer{border-top:1px solid var(--border);margin-top:1.5rem;padding-top:1rem;font-size:.82rem;color:var(--muted)}.answer footer p{margin:.6rem 0 0}.error{color:var(--critical);font-size:.85rem}
</style>
