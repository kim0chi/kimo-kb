<script setup lang="ts">
// Reader: renders a single doc from the content collection by its route path.
import { interactiveFor } from '~~/lib/interactive-map'
import { interactiveComponents } from '~/components/interactive/registry'

const route = useRoute()

const { data: doc } = await useAsyncData(`doc:${route.path}`, () =>
  queryCollection('docs').path(route.path).first(),
)

if (!doc.value) {
  throw createError({ statusCode: 404, statusMessage: `No doc at ${route.path}`, fatal: true })
}

const interactives = computed(() => (doc.value ? interactiveFor(route.path) : []))

// Reading state: mark 'reading' the first time this doc is opened (client only).
const { markOpened } = useReadingState()
onMounted(() => markOpened(route.path))
</script>

<template>
  <article v-if="doc" class="doc">
    <div class="doc-top">
      <StatusControl :path="route.path" />
      <ReadingSize />
    </div>

    <!-- Frontmatter meta for notes/decisions (SI_Docs sections have none). -->
    <div v-if="doc.ticket || doc.status || doc.date" class="meta">
      <span v-if="doc.ticket" class="m-ticket">{{ doc.ticket }}</span>
      <span v-if="doc.status" class="m-status" :class="doc.status">{{ doc.status }}</span>
      <span v-if="doc.area" class="m-area">{{ doc.area }}</span>
      <span v-if="doc.date" class="m-date">{{ doc.date }}</span>
      <span v-for="t in doc.tags || []" :key="t" class="m-tag">#{{ t }}</span>
    </div>

    <!-- Bespoke interactive explainers, mapped to this doc via the sidecar. -->
    <section v-if="interactives.length" class="interactives">
      <template v-for="id in interactives" :key="id">
        <component :is="interactiveComponents[id]" v-if="interactiveComponents[id]" />
      </template>
    </section>

    <ContentRenderer :value="doc" class="prose" />

    <NotesPanel :path="route.path" />

    <ReaderFooter :path="route.path" />
  </article>
</template>

<style scoped>
.doc-top { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1.25rem; }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-bottom: 1.5rem; }
.meta span { font-size: 0.72rem; padding: 0.05rem 0.45rem; border-radius: 4px; border: 1px solid var(--border); color: var(--muted); }
.m-ticket { font-family: var(--font-mono); color: var(--text) !important; }
.m-status { text-transform: uppercase; letter-spacing: 0.03em; }
.m-status.fixed, .m-status.committed { color: var(--good) !important; border-color: var(--good) !important; }
.m-status.planning, .m-status.investigating { color: var(--serious) !important; border-color: var(--serious) !important; }
.m-tag { border-style: dashed; }
.interactives { margin-bottom: 2rem; display: grid; gap: 1.25rem; }
</style>

<style>
/* Prose styling for rendered markdown (global so it reaches ContentRenderer output).
   Font-size scales with the reader's A−/A+ control via --reading-scale; heading
   sizes are em-relative so they scale in step. */
.prose {
  overflow-wrap: break-word;
  font-family: var(--font-ui);
  font-size: calc(1.0625rem * var(--reading-scale, 1));
  line-height: 1.72;
}
.prose > :first-child { margin-top: 0; }
.prose h1, .prose h2, .prose h3, .prose h4 { font-family: var(--font-serif); font-weight: 600; }
.prose h1 { font-size: 1.9em; line-height: 1.15; margin: 0 0 0.9rem; letter-spacing: -0.01em; }
.prose h2 { font-size: 1.42em; line-height: 1.22; margin: 2.4rem 0 0.85rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; }
.prose h3 { font-size: 1.16em; margin: 1.8rem 0 0.55rem; }
.prose p, .prose ul, .prose ol { margin: 0 0 1.05rem; }
.prose li { margin: 0.25rem 0; }
.prose code {
  font-family: var(--font-mono);
  background: var(--panel-2); border: 1px solid var(--border); border-radius: 4px;
  padding: 0.08rem 0.32rem; font-size: 0.82em;
}
.prose pre {
  background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px;
  padding: 0.9rem 1rem; overflow-x: auto; line-height: 1.55;
}
.prose pre code { background: none; border: none; padding: 0; font-size: 0.86em; }
.prose table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; font-size: 0.94em; }
.prose th, .prose td { border: 1px solid var(--border); padding: 0.4rem 0.6rem; text-align: left; }
.prose th { background: var(--panel); }
.prose blockquote {
  border-left: 3px solid var(--accent); margin: 1rem 0; padding: 0.1rem 1rem; color: var(--muted);
}
.prose img { max-width: 100%; }
/* Auto-linked glossary terms: subtle until hovered. */
.prose a.glossary-link {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px dotted var(--muted);
  cursor: help;
}
.prose a.glossary-link:hover { color: var(--accent); border-bottom-color: var(--accent); }
</style>
