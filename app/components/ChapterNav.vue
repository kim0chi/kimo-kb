<script setup lang="ts">
// Chapter-based navigation, sourced from reading-order.md via /api/nav.
const emit = defineEmits<{ navigate: [] }>()
const { data } = await useFetch('/api/nav')
const route = useRoute()
const { statusOf, progressOf } = useReadingState()
const { hasNote } = useNotes()

const extraGroups = computed(() => [
  { key: 'notes', label: 'Working notes', items: data.value?.notes ?? [] },
  { key: 'decisions', label: 'Decisions', items: data.value?.decisions ?? [] },
])
</script>

<template>
  <nav class="nav">
    <NuxtLink to="/" class="nav-home" @click="emit('navigate')">The path</NuxtLink>
    <NuxtLink to="/glossary" class="nav-home" @click="emit('navigate')">Glossary</NuxtLink>
    <NuxtLink to="/help" class="nav-home" @click="emit('navigate')">Help</NuxtLink>

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
              <span class="doc-title">{{ doc.title || doc.alias }}</span>
              <span v-if="hasNote(doc.path)" class="note-flag" title="Has notes">✎</span>
            </NuxtLink>
            <span v-else class="doc-missing" :title="`Unresolved: [[${doc.target}]]`">
              {{ doc.alias }}
            </span>
          </li>
        </ul>
      </li>
    </ol>

    <section v-for="grp in extraGroups" :key="grp.key" class="group">
      <h3 class="group-title">{{ grp.label }}</h3>
      <ul class="docs flat">
        <li v-for="d in grp.items" :key="d.path">
          <NuxtLink
            :to="d.path"
            class="doc-link"
            :class="{ active: route.path === d.path }"
            @click="emit('navigate')"
          >
            <StatusDot :status="statusOf(d.path)" />
            <span class="doc-title">{{ d.title }}</span>
            <span v-if="d.status" class="st-badge" :class="d.status">{{ d.status }}</span>
            <span v-if="hasNote(d.path)" class="note-flag">✎</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
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
.note-flag { font-size: 0.72rem; color: var(--muted); flex: 0 0 auto; }
.doc-title { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.group { margin-top: 1.5rem; }
.group-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin: 0 0 0.4rem; }
.docs.flat { padding-left: 0; }
.st-badge { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.03em; padding: 0.02rem 0.35rem; border-radius: 4px; border: 1px solid var(--border); color: var(--muted); flex: 0 0 auto; }
.st-badge.fixed, .st-badge.committed { color: var(--done); border-color: var(--done); }
.st-badge.planning, .st-badge.investigating { color: #f0a35e; border-color: #f0a35e; }
.doc-missing { font-size: 0.9rem; color: #6b7280; font-style: italic; }
</style>
