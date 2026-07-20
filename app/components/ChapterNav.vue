<script setup lang="ts">
// Chapter-based navigation, sourced from reading-order.md via /api/nav.
const emit = defineEmits<{ navigate: [] }>()
const { data } = await useFetch('/api/nav')
const route = useRoute()
const { statusOf, progressOf } = useReadingState()
const { hasNote } = useNotes()
</script>

<template>
  <nav class="nav">
    <NuxtLink to="/" class="nav-home" @click="emit('navigate')">The path</NuxtLink>
    <NuxtLink to="/glossary" class="nav-home" @click="emit('navigate')">Glossary</NuxtLink>

    <ol class="chapters">
      <li v-for="ch in data?.chapters" :key="ch.number" class="chapter">
        <div class="chapter-head">
          <span class="chapter-title">Ch {{ ch.number }} — {{ ch.title }}</span>
          <span class="progress">
            {{ progressOf(ch.docs.map((d) => d.path)).done }}/{{
              progressOf(ch.docs.map((d) => d.path)).total
            }}
          </span>
        </div>
        <ul class="docs">
          <li v-for="doc in ch.docs" :key="doc.target">
            <NuxtLink
              v-if="doc.path"
              :to="doc.path"
              class="doc-link"
              :class="{ active: route.path === doc.path }"
              @click="emit('navigate')"
            >
              <StatusDot :status="statusOf(doc.path)" />
              <span>{{ doc.title || doc.alias }}</span>
              <span v-if="hasNote(doc.path)" class="note-flag" title="Has notes">✎</span>
            </NuxtLink>
            <span v-else class="doc-missing" :title="`Unresolved: [[${doc.target}]]`">
              {{ doc.alias }}
            </span>
          </li>
        </ul>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.nav-home {
  display: inline-block; margin-right: 1rem; margin-bottom: 0.75rem;
  font-weight: 600; color: var(--text);
}
.chapters { list-style: none; margin: 0; padding: 0; }
.chapter { margin-bottom: 1rem; }
.chapter-head { display: flex; gap: 0.5rem; align-items: baseline; justify-content: space-between; }
.chapter-title { font-weight: 600; font-size: 0.9rem; }
.progress { font-size: 0.72rem; color: var(--muted); flex: 0 0 auto; }
.docs { list-style: none; margin: 0.25rem 0 0; padding-left: 0.6rem; }
.docs li { margin: 0.15rem 0; }
.doc-link { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--muted); }
.doc-link.active { color: var(--accent); font-weight: 600; }
.note-flag { font-size: 0.72rem; color: var(--muted); margin-left: auto; flex: 0 0 auto; }
.doc-missing { font-size: 0.9rem; color: #6b7280; font-style: italic; }
</style>
