<script setup lang="ts">
// Glossary — filterable term index parsed from §17.
const { data } = await useFetch('/api/glossary')
const q = ref('')

const filtered = computed(() => {
  const terms = data.value?.terms ?? []
  const needle = q.value.trim().toLowerCase()
  if (!needle) return terms
  return terms.filter(
    (t) => t.term.toLowerCase().includes(needle) || t.meaning.toLowerCase().includes(needle),
  )
})
</script>

<template>
  <div>
    <h1>Glossary</h1>
    <p class="lede">
      Every specialised term, defined from zero. Definitions state <em>what a thing is</em>
      before <em>how this app uses it</em>.
    </p>

    <input v-model="q" class="search" type="search" placeholder="Filter terms…" />

    <dl class="terms">
      <div v-for="t in filtered" :key="t.term + t.group" class="term">
        <dt>
          {{ t.term }}
          <span class="group">{{ t.group }}</span>
        </dt>
        <dd>{{ t.meaning }}</dd>
      </div>
    </dl>
    <p v-if="!filtered.length" class="empty">No terms match “{{ q }}”.</p>
  </div>
</template>

<style scoped>
.lede { color: var(--muted); margin-top: 0; }
.search {
  width: 100%; padding: 0.6rem 0.8rem; margin: 0.5rem 0 1.5rem;
  background: var(--panel); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font-size: 1rem;
}
.terms { margin: 0; }
.term {
  border-bottom: 1px solid var(--border); padding: 0.9rem 0;
}
dt { font-weight: 700; display: flex; align-items: baseline; gap: 0.6rem; }
.group {
  font-size: 0.7rem; font-weight: 500; color: var(--muted);
  border: 1px solid var(--border); border-radius: 999px; padding: 0.05rem 0.5rem;
}
dd { margin: 0.35rem 0 0; color: var(--muted); }
.empty { color: var(--muted); }
</style>
