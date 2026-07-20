import { defineContentConfig, defineCollection } from '@nuxt/content'

// Read markdown straight from the external evo-work repo (in place, never copied).
// `cwd` is the corpus root; `include` selects the SI_Docs tree. Later phases can add
// sibling collections for notes/ and decisions/ from the same root.
const contentRoot = process.env.KB_CONTENT_ROOT || '/home/evo-benedict/Documents/evo-work'

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      source: {
        cwd: contentRoot,
        include: 'SI_Docs/**/*.md',
        // Skip the redundant HTML/PDF twins (already excluded by *.md) — nothing else needed.
      },
    }),
  },
})
