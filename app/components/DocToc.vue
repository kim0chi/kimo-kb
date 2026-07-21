<script setup lang="ts">
// "On this page" — an in-doc table of contents built from the rendered H2s
// (Content gives headings ids), with scroll-spy. Hidden when a doc has < 3.
const route = useRoute()
const headings = ref<{ id: string; text: string }[]>([])
const activeId = ref('')
let observer: IntersectionObserver | null = null

function scan() {
  const els = document.querySelectorAll<HTMLElement>('article.doc .prose h2[id]')
  headings.value = [...els].map((h) => ({ id: h.id, text: h.textContent || '' }))
  observer?.disconnect()
  if (!els.length) return
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) activeId.value = (e.target as HTMLElement).id
    },
    { rootMargin: '-10% 0px -75% 0px', threshold: 0 },
  )
  els.forEach((el) => observer!.observe(el))
}

function rescan() {
  nextTick(() => requestAnimationFrame(scan))
}
onMounted(rescan)
watch(() => route.path, rescan)
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <details v-if="headings.length >= 3" class="toc" open>
    <summary>On this page</summary>
    <nav>
      <a
        v-for="h in headings"
        :key="h.id"
        :href="`#${h.id}`"
        class="toc-link"
        :class="{ active: activeId === h.id }"
      >{{ h.text }}</a>
    </nav>
  </details>
</template>

<style scoped>
.toc {
  border: 1px solid var(--border); border-radius: 10px; padding: 0.4rem 0.9rem 0.7rem;
  margin-bottom: 1.75rem; background: var(--panel);
}
summary {
  cursor: pointer; font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--muted); padding: 0.3rem 0;
}
nav { display: flex; flex-direction: column; gap: 0.1rem; margin-top: 0.3rem; }
.toc-link {
  color: var(--muted); font-size: 0.88rem; padding: 0.15rem 0.6rem;
  border-left: 2px solid transparent; text-decoration: none;
}
.toc-link:hover { color: var(--text); text-decoration: none; }
.toc-link.active { color: var(--accent); border-left-color: var(--accent); font-weight: 500; }
</style>
