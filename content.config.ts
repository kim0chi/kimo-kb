import { defineContentConfig, defineCollection, z } from '@nuxt/content'

// Read markdown straight from the external evo-work repo (in place, never copied).
// `cwd` is the corpus root; `include` selects the three trees we surface:
// SI_Docs (the handbook), notes/ (working notes) and decisions/ (the decision log).
const contentRoot = process.env.KB_CONTENT_ROOT || '/home/evo-benedict/Documents/evo-work'

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      source: [
        { cwd: contentRoot, include: 'SI_Docs/**/*.md' },
        { cwd: contentRoot, include: 'notes/**/*.md' },
        { cwd: contentRoot, include: 'decisions/**/*.md' },
      ],
      // notes/ and decisions/ carry frontmatter; declare the fields so nav and the
      // reader can query them. SI_Docs files simply leave them undefined.
      schema: z.object({
        ticket: z.string().optional(),
        area: z.string().optional(),
        status: z.string().optional(),
        date: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    }),
  },
})
