import { defineContentConfig, defineCollection, z } from '@nuxt/content'
import { loadNotebooks, treePrefix } from './lib/notebooks'

// One `docs` collection whose sources are generated from the notebook library.
// Each notebook's trees are read in place from its (possibly external) root, with
// an explicit `prefix` so paths are namespaced per notebook (e.g. /si/si-docs/...).
const libraryDir = process.env.KB_LIBRARY || '/home/evo-benedict/Documents/knowledge'
const fallbackRoot = process.env.KB_CONTENT_ROOT || '/home/evo-benedict/Documents/evo-work'
const notebooks = loadNotebooks(libraryDir, fallbackRoot)

const sources = notebooks.flatMap((nb) =>
  nb.trees.map((tree) => ({
    cwd: nb.root,
    include: tree === '.' ? '**/*.md' : `${tree}/**/*.md`,
    prefix: treePrefix(nb, tree),
  })),
)

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      source: sources,
      // notes/ and decisions/ carry frontmatter; SI_Docs leaves these undefined.
      schema: z.object({
        ticket: z.string().optional(),
        area: z.string().optional(),
        status: z.string().optional(),
        date: z.string().optional(),
        tags: z.array(z.string()).optional(),
        // guide/interview notebooks
        difficulty: z.string().optional(),
        order: z.number().optional(),
      }),
    }),
  },
})
