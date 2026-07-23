import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseGlossary, buildLinkIndex } from './lib/glossary'
import { glossaryOverrides } from './lib/glossary-overrides'
import remarkGlossary from './lib/remark-glossary'
import remarkFlashcard from './lib/remark-flashcard'

// KB — private knowledge-base reader over the external evo-work markdown corpus.
// The corpus is read in place from KB_CONTENT_ROOT; it is never copied or mutated.
const contentRoot = process.env.KB_CONTENT_ROOT || '/home/evo-benedict/Documents/evo-work'

// Build the glossary auto-link index once, at config load, from §17. Baked into
// the remark plugin so terms become clickable across the corpus at build time.
// (Restart the dev server after editing the glossary to rebuild this index.)
let glossaryLinkIndex: ReturnType<typeof buildLinkIndex> = []
try {
  const raw = readFileSync(join(contentRoot, 'SI_Docs', 'sections', '17-glossary-appendices.md'), 'utf8')
  glossaryLinkIndex = buildLinkIndex(parseGlossary(raw, glossaryOverrides))
} catch (e) {
  console.warn('[kb] could not build glossary link index:', (e as Error).message)
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  modules: ['@nuxt/content', '@nuxt/fonts'],

  // Self-host the IBM Plex superfamily (Zed's UI font + editorial serif + mono).
  // @nuxt/fonts downloads and serves them locally — no runtime CDN request.
  fonts: {
    families: [
      { name: 'IBM Plex Sans', provider: 'google', weights: [400, 500, 600, 700] },
      { name: 'IBM Plex Serif', provider: 'google', weights: [400, 600, 700], styles: ['normal', 'italic'] },
      { name: 'IBM Plex Mono', provider: 'google', weights: [400, 500, 600] },
    ],
  },

  // Make the remark-glossary plugin key resolvable, so Content's generated
  // client mdc-imports can import it without a build warning. The plugin no-ops
  // when called without an index (its transform already ran server-side at build).
  alias: {
    'remark-glossary': fileURLToPath(new URL('./lib/remark-glossary.ts', import.meta.url)),
    'remark-flashcard': fileURLToPath(new URL('./lib/remark-flashcard.ts', import.meta.url)),

    // Point straight at the PHP 8.3 emscripten glue. Its package's `exports` map
    // only publishes the index, and that index also pulls in the optional intl
    // extension as a .so — which the bundler can't load. We don't use intl, so we
    // reach past the index to the two builds and pick between them ourselves.
    '#php-jspi': fileURLToPath(new URL('./node_modules/@php-wasm/web-8-3/jspi/php_8_3.js', import.meta.url)),
    '#php-asyncify': fileURLToPath(new URL('./node_modules/@php-wasm/web-8-3/asyncify/php_8_3.js', import.meta.url)),
  },

  content: {
    build: {
      markdown: {
        // Auto-link glossary terms in doc bodies (clickable anywhere in the corpus).
        remarkPlugins: {
          'remark-glossary': { instance: remarkGlossary, options: { index: glossaryLinkIndex } },
          'remark-flashcard': { instance: remarkFlashcard },
        },
      },
    },
  },

  // Content is company-internal architecture docs — never expose publicly.
  // Access is local + Tailscale only (see README).
  ssr: true,

  runtimeConfig: {
    // Server-only: the notebook library dir (scanned for kb.json manifests) and the
    // fallback corpus root used when the library is empty.
    library: process.env.KB_LIBRARY || '/home/evo-benedict/Documents/knowledge',
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

  vite: {
    // The PHP glue is reached through the #php-* aliases above, so it's a source
    // module rather than a dependency — keep the pre-bundler's hands off it and let
    // the normal asset pipeline emit its .wasm.
    optimizeDeps: { exclude: ['@php-wasm/web-8-3'] },
    plugins: [
      {
        // The glue does `import dependencyFilename from './…/php_8_3.wasm'`, and a
        // bare .wasm import lands on a code path that 404s in dev. Asking for the
        // URL explicitly is what the glue wants anyway — dependencyFilename is
        // passed straight to fetch().
        name: 'kb:php-wasm-as-url',
        enforce: 'pre' as const,
        transform(code: string, id: string) {
          if (!id.includes('@php-wasm') || !id.includes('php_8_3.js')) return
          const out = code.replace(/from (['"])(\.\/[^'"]+\.wasm)\1/, 'from $1$2?url$1')
          return out === code ? undefined : out
        },
      },
    ],
  },

  app: {
    head: {
      title: 'SI Handbook',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
      // Set the theme before first paint (no flash): stored choice, else system.
      script: [
        {
          tagPosition: 'head',
          innerHTML:
            "(function(){try{var d=document.documentElement;var t=localStorage.getItem('kb-theme');if(t!=='light'){if(t!=='dark'){t='dark';var m=window.matchMedia;if(m){if(m('(prefers-color-scheme: light)').matches){t='light';}}}}d.dataset.theme=t;var r=localStorage.getItem('kb-reading');if(r){d.dataset.reading=r;}}catch(e){}})();",
        },
      ],
    },
  },

  devtools: { enabled: true },
})
