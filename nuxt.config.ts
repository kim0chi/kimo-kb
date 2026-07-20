// KB — private knowledge-base reader over the external evo-work markdown corpus.
// The corpus is read in place from KB_CONTENT_ROOT; it is never copied or mutated.
const contentRoot = process.env.KB_CONTENT_ROOT || '/home/evo-benedict/Documents/evo-work'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  modules: ['@nuxt/content'],

  // Content is company-internal architecture docs — never expose publicly.
  // Access is local + Tailscale only (see README).
  ssr: true,

  runtimeConfig: {
    // Server-only: absolute path to the corpus root, used by nav/glossary parsers.
    contentRoot,
    // Server-only: local SQLite file holding app state (reading status, later notes).
    // Lives inside the kb repo and is gitignored — it never touches the corpus.
    stateDbPath: process.env.KB_STATE_DB || '',
  },

  nitro: {
    // Allow Nitro/Content to read files from outside the project dir.
    externals: { inline: [] },
  },

  app: {
    head: {
      title: 'SI Handbook',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    },
  },

  devtools: { enabled: true },
})
