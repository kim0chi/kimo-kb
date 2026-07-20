<script setup lang="ts">
// Compact reading-status indicator. Secondary-encoded by SHAPE (ring / filled /
// check), not color alone — so it survives colour-blindness and greyscale, per
// the dataviz color rules (green↔orange sit in the CVD floor band).
const props = defineProps<{ status: 'unread' | 'reading' | 'done' }>()
const label = computed(
  () => ({ unread: 'Unread', reading: 'Reading', done: 'Done' })[props.status],
)
</script>

<template>
  <span class="sd" :class="props.status" :title="label" role="img" :aria-label="label">
    <svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true">
      <!-- unread: hollow ring -->
      <circle v-if="props.status === 'unread'" cx="7" cy="7" r="5.25" fill="none" stroke="currentColor" stroke-width="1.5" />
      <!-- reading: filled disc -->
      <circle v-else-if="props.status === 'reading'" cx="7" cy="7" r="5.75" fill="currentColor" />
      <!-- done: ring + check -->
      <template v-else>
        <circle cx="7" cy="7" r="6" fill="currentColor" />
        <path d="M4.2 7.2 L6.2 9.2 L9.8 4.9" fill="none" stroke="var(--on-good)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </template>
    </svg>
  </span>
</template>

<style scoped>
.sd { display: inline-flex; flex: 0 0 auto; line-height: 0; }
.sd.unread { color: var(--faint); }
.sd.reading { color: var(--accent); }
.sd.done { color: var(--good); }
</style>
