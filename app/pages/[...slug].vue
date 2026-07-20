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
    <div class="doc-status">
      <StatusControl :path="route.path" />
    </div>

    <!-- Bespoke interactive explainers, mapped to this doc via the sidecar. -->
    <section v-if="interactives.length" class="interactives">
      <template v-for="id in interactives" :key="id">
        <component :is="interactiveComponents[id]" v-if="interactiveComponents[id]" />
      </template>
    </section>

    <ContentRenderer :value="doc" class="prose" />
  </article>
</template>

<style scoped>
.doc-status { margin-bottom: 1.25rem; }
.interactives { margin-bottom: 2rem; display: grid; gap: 1.25rem; }
</style>

<style>
/* Prose styling for rendered markdown (global so it reaches ContentRenderer output). */
.prose { overflow-wrap: break-word; }
.prose h1 { font-size: 1.7rem; margin-top: 0; }
.prose h2 { font-size: 1.35rem; margin-top: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; }
.prose h3 { font-size: 1.1rem; margin-top: 1.5rem; }
.prose code {
  background: #0e1013; border: 1px solid var(--border); border-radius: 4px;
  padding: 0.1rem 0.35rem; font-size: 0.88em;
}
.prose pre {
  background: #0e1013; border: 1px solid var(--border); border-radius: 8px;
  padding: 0.9rem 1rem; overflow-x: auto;
}
.prose pre code { background: none; border: none; padding: 0; }
.prose table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; }
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
