<script setup lang="ts">
// An inline flashcard in a doc body: the question is shown, the answer waits behind
// a reveal so reading the concept doesn't hand you the answer. The remark-flashcard
// plugin turns a ```flashcard``` fence into this; the same fence also feeds the
// spaced-repetition deck at Review, so a card tests you twice — here, and later.
const props = defineProps<{ front: string; back: string }>()
const shown = ref(false)
</script>

<template>
  <div class="fc" :class="{ open: shown }">
    <div class="fc-head">
      <span class="fc-badge">Quiz yourself</span>
      <button v-if="!shown" class="fc-toggle" @click="shown = true">Show answer</button>
      <button v-else class="fc-toggle" @click="shown = false">Hide</button>
    </div>
    <div class="fc-front"><MDC :value="props.front" /></div>
    <div v-show="shown" class="fc-back"><MDC :value="props.back" /></div>
  </div>
</template>

<style scoped>
.fc {
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  background: var(--panel);
  padding: 0.9rem 1.1rem;
  margin: 1.5rem 0;
}
.fc-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem; }
.fc-badge { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--accent); font-weight: 700; }
.fc-toggle {
  background: none; border: 1px solid var(--border); color: var(--muted);
  border-radius: 6px; padding: 0.15rem 0.6rem; font-size: 0.75rem; cursor: pointer;
}
.fc-toggle:hover { border-color: var(--accent); color: var(--text); }
.fc-front :deep(p) { margin: 0; font-weight: 500; }
.fc-back {
  margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed var(--border); color: var(--muted);
}
.fc-back :deep(p) { margin: 0 0 0.5rem; }
.fc-back :deep(p:last-child) { margin-bottom: 0; }
.fc :deep(code) { font-family: var(--font-mono); font-size: 0.88em; background: var(--panel-2); padding: 0.05rem 0.3rem; border-radius: 4px; }
</style>
