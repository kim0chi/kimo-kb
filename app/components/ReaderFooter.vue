<script setup lang="ts">
// End-of-doc footer for docs that sit in the reading order: the chapter's
// "You're done when" checkpoint (with a quick Mark-done) and prev/next paging.
// Docs outside the reading order (notes/decisions) render nothing.
const props = defineProps<{ path: string; notebook: string }>()
const { data } = await useFetch(() => `/api/nav?notebook=${props.notebook}`, {
  key: () => `nav:${props.notebook}`,
})
const { statusOf, setStatus } = useReadingState()

interface FlatDoc {
  path: string
  title: string
  chNum: number
  chTitle: string
  doneWhen: string | null
}

const flat = computed<FlatDoc[]>(() =>
  (data.value?.chapters ?? []).flatMap((ch) =>
    ch.docs
      .filter((d) => d.path)
      .map((d) => ({
        path: d.path as string,
        title: d.title || d.alias,
        chNum: ch.number,
        chTitle: ch.title,
        doneWhen: ch.doneWhen,
      })),
  ),
)

const idx = computed(() => flat.value.findIndex((d) => d.path === props.path))
const current = computed(() => (idx.value >= 0 ? flat.value[idx.value] : null))
const prev = computed(() => (idx.value > 0 ? flat.value[idx.value - 1] : null))
const next = computed(() =>
  idx.value >= 0 && idx.value < flat.value.length - 1 ? flat.value[idx.value + 1] : null,
)
const isDone = computed(() => statusOf(props.path) === 'done')
</script>

<template>
  <footer v-if="current" class="reader-footer">
    <div v-if="current.doneWhen" class="checkpoint" :class="{ done: isDone }">
      <div class="cp-text">
        <span class="cp-label">You're done when</span>
        {{ current.doneWhen }}
      </div>
      <button v-if="!isDone" class="cp-btn" @click="setStatus(props.path, 'done')">Mark done</button>
      <span v-else class="cp-done">✓ Done</span>
    </div>

    <nav class="pager" aria-label="Reading order">
      <NuxtLink v-if="prev" :to="prev.path" class="pg">
        <span class="dir">← Previous</span>
        <span class="pg-title">{{ prev.title }}</span>
      </NuxtLink>
      <span v-else class="pg-spacer" />
      <NuxtLink v-if="next" :to="next.path" class="pg next">
        <span class="dir">Next →</span>
        <span class="pg-title">{{ next.title }}</span>
      </NuxtLink>
    </nav>
  </footer>
</template>

<style scoped>
.reader-footer { margin-top: 2.5rem; }
.checkpoint {
  display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap;
  border: 1px solid var(--border); border-left: 3px solid var(--accent);
  border-radius: 0 8px 8px 0; padding: 0.75rem 0.95rem; background: var(--panel);
}
.checkpoint.done { border-left-color: var(--good); }
.cp-text { flex: 1 1 16rem; font-size: 0.92rem; }
.cp-label {
  display: inline-block; margin-right: 0.4rem; font-size: 0.68rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.04em; color: var(--accent);
}
.cp-btn {
  flex: 0 0 auto; background: var(--good); color: var(--on-good); border: none;
  border-radius: 7px; padding: 0.4rem 0.8rem; font-weight: 600; font-size: 0.85rem; cursor: pointer;
}
.cp-done { flex: 0 0 auto; color: var(--good); font-weight: 600; font-size: 0.9rem; }

.pager { display: flex; gap: 0.75rem; margin-top: 1rem; }
.pg {
  flex: 1 1 0; display: flex; flex-direction: column; gap: 0.15rem; min-width: 0;
  border: 1px solid var(--border); border-radius: 10px; padding: 0.7rem 0.9rem;
  color: var(--text); text-decoration: none;
}
.pg:hover { border-color: var(--accent); text-decoration: none; }
.pg.next { text-align: right; }
.pg-spacer { flex: 1 1 0; }
.dir { font-size: 0.72rem; color: var(--muted); }
.pg-title { font-weight: 600; font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
