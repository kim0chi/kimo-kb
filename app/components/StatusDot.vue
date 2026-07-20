<script setup lang="ts">
// Compact status indicator for list rows.
const props = defineProps<{ status: 'unread' | 'reading' | 'done' }>()
const label = computed(() => ({ unread: 'Unread', reading: 'Reading', done: 'Done' }[props.status]))
</script>

<template>
  <span class="dot" :class="props.status" :title="label" :aria-label="label" />
</template>

<style scoped>
.dot {
  display: inline-block; width: 0.6rem; height: 0.6rem; border-radius: 50%;
  flex: 0 0 auto; border: 1px solid var(--border);
}
.dot.unread { background: transparent; }
.dot.reading { background: var(--accent); border-color: var(--accent); }
.dot.done { background: var(--done); border-color: var(--done); }
</style>
