<script setup lang="ts">
// A notebook's glossary — structured term index. Each term shows what it *is*
// (general) separately from how *this app* uses it, linkable by #slug anchor.
const route = useRoute()
const notebook = computed(() => route.params.notebook as string)
const { data } = await useFetch(() => `/api/glossary?notebook=${notebook.value}`, {
  key: () => `glossary:${notebook.value}`,
})
const { data: nav } = await useFetch(() => `/api/nav?notebook=${notebook.value}`, { key: () => `nav:${notebook.value}` })
const q = ref('')

const filtered = computed(() => {
  const terms = data.value?.terms ?? []
  const needle = q.value.trim().toLowerCase()
  if (!needle) return terms
  return terms.filter(
    (t) =>
      t.term.toLowerCase().includes(needle) ||
      t.whatIs.toLowerCase().includes(needle) ||
      t.howUsed.toLowerCase().includes(needle) ||
      (t.expansion ?? '').toLowerCase().includes(needle),
  )
})

// Minimal, safe inline-markdown -> HTML for the split fields (code + bold only).
function inline(s: string): string {
  const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

onMounted(() => {
  if (route.hash) {
    const el = document.querySelector(route.hash)
    el?.scrollIntoView()
    el?.classList.add('flash')
  }
})
</script>

<template>
  <div>
    <nav class="crumb" aria-label="Breadcrumb">
      <NuxtLink to="/">Library</NuxtLink>
      <span class="sep">›</span>
      <NuxtLink :to="`/${notebook}`">{{ nav?.notebook?.title || notebook }}</NuxtLink>
      <span class="sep">›</span>
      <span class="crumb-here">Glossary</span>
    </nav>

    <h1>Glossary</h1>
    <p class="lede">
      Every specialised term, defined from zero — <em>what a thing is</em> before
      <em>how this app uses it</em>.
    </p>

    <input v-model="q" class="search" type="search" placeholder="Filter terms…" >

    <dl class="terms">
      <div v-for="t in filtered" :id="t.slug" :key="t.slug" class="term">
        <dt>
          <a :href="`#${t.slug}`" class="anchor">{{ t.term }}</a>
          <span v-if="t.expansion" class="expansion">{{ t.expansion }}</span>
          <span class="group">{{ t.group }}</span>
        </dt>
        <dd>
          <p class="what-is"><span v-html="inline(t.whatIs)" /></p>
          <p v-if="t.howUsed" class="how-used">
            <span class="tag">In this app</span><span v-html="inline(t.howUsed)" />
          </p>
        </dd>
      </div>
    </dl>
    <p v-if="!filtered.length" class="empty">
      {{ data?.terms?.length ? `No terms match “${q}”.` : 'This notebook has no glossary.' }}
    </p>
  </div>
</template>

<style scoped>
.crumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--muted); margin-bottom: 1rem; flex-wrap: wrap; }
.crumb a { color: var(--muted); }
.crumb a:hover { color: var(--accent); }
.sep { opacity: 0.55; }
.crumb-here { color: var(--text); }
.lede { color: var(--muted); margin-top: 0; }
.search {
  width: 100%; padding: 0.6rem 0.8rem; margin: 0.5rem 0 1.5rem;
  background: var(--panel); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font-size: 1rem;
}
.terms { margin: 0; }
.term { border-bottom: 1px solid var(--border); padding: 0.9rem 0; scroll-margin-top: 4rem; }
.term.flash { animation: flash 1.2s ease; }
@keyframes flash { from { background: var(--accent-soft); } to { background: transparent; } }
dt { display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; }
.anchor { font-weight: 700; color: var(--text); }
.anchor:hover { color: var(--accent); text-decoration: none; }
.expansion { color: var(--muted); font-style: italic; font-size: 0.9rem; }
.group {
  font-size: 0.7rem; font-weight: 500; color: var(--muted);
  border: 1px solid var(--border); border-radius: 999px; padding: 0.05rem 0.5rem; margin-left: auto;
}
dd { margin: 0.4rem 0 0; }
.what-is { margin: 0; }
.how-used { margin: 0.4rem 0 0; color: var(--muted); font-size: 0.95rem; }
.tag {
  display: inline-block; margin-right: 0.5rem; font-size: 0.68rem; font-weight: 600;
  color: var(--accent); border: 1px solid var(--accent); border-radius: 4px;
  padding: 0.02rem 0.4rem; vertical-align: 1px;
}
:deep(code) {
  background: var(--panel-2); border: 1px solid var(--border); border-radius: 4px;
  padding: 0.05rem 0.3rem; font-size: 0.85em;
}
.empty { color: var(--muted); }
</style>
