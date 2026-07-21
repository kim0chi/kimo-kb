<script setup lang="ts">
// A−/A+ reader text-size control. Persists via useReadingSize.
const { inc, dec, canInc, canDec } = useReadingSize()
</script>

<template>
  <div class="rsize" role="group" aria-label="Reading text size">
    <button :disabled="!canDec" aria-label="Smaller text" @click="dec">A<span class="minus">−</span></button>
    <button :disabled="!canInc" aria-label="Larger text" @click="inc">A<span class="plus">+</span></button>
  </div>
</template>

<style scoped>
.rsize { display: inline-flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.rsize button {
  background: var(--panel); color: var(--muted); border: none; cursor: pointer;
  padding: 0.35rem 0.6rem; font-size: 0.85rem; line-height: 1; min-height: 2rem;
}
.rsize button:first-child { border-right: 1px solid var(--border); }
.rsize button:hover:not(:disabled) { color: var(--text); }
.rsize button:disabled { opacity: 0.4; cursor: default; }
.minus, .plus { font-size: 0.72em; vertical-align: 1px; }
.plus { font-size: 0.9em; }
</style>
