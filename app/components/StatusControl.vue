<script setup lang="ts">
// Segmented reading-status control for a single doc. Replaces the folder drag.
const props = defineProps<{ path: string }>()
const { statusOf, setStatus } = useReadingState()

const options: { value: 'unread' | 'reading' | 'done'; label: string }[] = [
  { value: 'unread', label: 'Unread' },
  { value: 'reading', label: 'Reading' },
  { value: 'done', label: 'Done' },
]

const current = computed(() => statusOf(props.path))
</script>

<template>
  <div class="status" role="group" aria-label="Reading status">
    <button
      v-for="o in options"
      :key="o.value"
      class="seg"
      :class="[o.value, { active: current === o.value }]"
      :aria-pressed="current === o.value"
      @click="setStatus(props.path, o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>

<style scoped>
.status { display: inline-flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.seg {
  background: var(--panel); color: var(--muted); border: none;
  padding: 0.4rem 0.85rem; font-size: 0.85rem; cursor: pointer;
  border-right: 1px solid var(--border);
}
.seg:last-child { border-right: none; }
.seg:hover { color: var(--text); }
.seg.active { color: #fff; }
.seg.active.unread { background: var(--neutral); }
.seg.active.reading { background: var(--accent); color: var(--on-accent); }
.seg.active.done { background: var(--good); color: var(--on-good); }
</style>
