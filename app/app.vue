<script setup lang="ts">
// Global shell: mobile-first, single-column reading layout with a slide-in nav.
const navOpen = ref(false)
const { theme, toggle } = useTheme()
const { toggle: toggleJump } = useQuickJump()

// Slim reading-progress bar under the topbar (client-only).
const route = useRoute()
const progress = ref(0)
function onScroll() {
  const el = document.documentElement
  const max = el.scrollHeight - el.clientHeight
  progress.value = max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0
}
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
watch(() => route.path, () => nextTick(onScroll))
</script>

<template>
  <div class="app">
    <header class="topbar">
      <button class="menu-btn" aria-label="Toggle navigation" @click="navOpen = !navOpen">
        ☰
      </button>
      <NuxtLink to="/" class="brand">SI Handbook</NuxtLink>
      <button class="jump-btn" aria-label="Quick jump (Ctrl/Cmd K)" title="Quick jump  ⌘K" @click="toggleJump">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <span class="jump-hint">⌘K</span>
      </button>
      <button
        class="theme-btn"
        :aria-label="`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`"
        :title="`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`"
        @click="toggle"
      >
        <svg v-if="theme === 'dark'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
        </svg>
      </button>
      <div class="scroll-progress" :style="{ width: progress + '%' }" />
    </header>

    <div class="body" :class="{ 'nav-open': navOpen }">
      <aside class="sidebar" @click.self="navOpen = false">
        <ChapterNav @navigate="navOpen = false" />
      </aside>
      <main class="content">
        <NuxtPage />
      </main>
    </div>
    <QuickJump />
  </div>
</template>

<style>
:root {
  color-scheme: dark;

  /* Surfaces — warm charcoal (Anthropic warm neutrals) */
  --bg: #1c1a17;
  --panel: #262320;
  --panel-2: #131110;      /* code blocks / insets */
  --border: #37332d;

  /* Ink — warm ivory */
  --text: #ece7de;
  --muted: #a8a196;
  --faint: #736e64;

  /* Brand / interactive — Claude terracotta (5.58:1 on bg, 5.03:1 on panel — AA text) */
  --accent: #da7756;
  --accent-soft: rgba(217, 119, 86, 0.16);
  --on-accent: #2a1710;    /* warm ink on an accent fill */

  /* Reading-state + status — RESERVED, always paired with a glyph or label,
     never color alone (see StatusDot). */
  --good: #0ca30c;         /* done · committed · fixed */
  --good-soft: rgba(12, 163, 12, 0.16);
  --on-good: #06210f;
  --warning: #fab219;      /* caution (status; ships with icon/label) */
  --serious: #e0a45c;      /* amber — distinct from the terracotta accent */
  --critical: #d03b3b;     /* failure */
  --on-critical: #ffffff;
  --neutral: #46423a;      /* unread / inert */

  /* Diagram roles — terracotta browser + a cool teal server (CVD-safe complement) */
  --role-server: #57b3a2;
  --role-browser: var(--accent);

  /* Typography — the IBM Plex superfamily (Zed's UI sans + editorial serif + mono) */
  --font-ui: 'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-serif: 'IBM Plex Serif', Georgia, 'Times New Roman', serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', 'Cascadia Code', monospace;

  --max: 46rem;
}

/* Light theme — a SELECTED set (not an auto-flip). Each hue re-validated against
   the light surfaces: status tokens double as badge text, so they clear AA 4.5:1
   as text on #fff/#f5f7fa; the on-* inks flip to white for the darker fills. */
:root[data-theme='light'] {
  color-scheme: light;

  --bg: #f3f1e9;           /* warm parchment page */
  --panel: #fcfbf7;        /* warm white card */
  --panel-2: #ece7db;      /* warm tan code inset */
  --border: #e1ddd0;

  --text: #262320;         /* 13.8:1 on page */
  --muted: #6b6660;        /* 5.0:1 */
  --faint: #7f7970;

  --accent: #b0492a;                       /* terracotta — 4.85:1 page, 5.29:1 card */
  --accent-soft: rgba(176, 73, 42, 0.12);
  --on-accent: #ffffff;

  --good: #0a7a12;                         /* 4.88:1 page; white on it 5.52:1 */
  --good-soft: rgba(10, 122, 18, 0.12);
  --on-good: #ffffff;
  --warning: #b07400;
  --serious: #8a5e15;                      /* amber-brown (4.9:1 page) */
  --critical: #cf2b2b;                     /* 4.60:1 page */
  --on-critical: #ffffff;
  --neutral: #625d54;                      /* white text ~4.9:1 */

  --role-server: #2f7e72;                  /* cool teal */
}
/* Reader text-size steps (drives .prose in the reader). */
html { --reading-scale: 1; }
html[data-reading='sm'] { --reading-scale: 0.94; }
html[data-reading='lg'] { --reading-scale: 1.12; }
html[data-reading='xl'] { --reading-scale: 1.26; }

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

/* Editorial headings (serif) + code (mono), applied everywhere. */
h1, h2 { font-family: var(--font-serif); font-weight: 600; }
code, pre, samp { font-family: var(--font-mono); }

/* Consistent keyboard focus ring across all interactive elements. */
:where(a, button, input, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}

.topbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.6rem 1rem;
  background: var(--panel); border-bottom: 1px solid var(--border);
}
.menu-btn {
  background: none; border: 1px solid var(--border); color: var(--text);
  border-radius: 6px; font-size: 1.1rem; padding: 0.2rem 0.6rem; cursor: pointer;
}
.brand { font-family: var(--font-serif); font-weight: 600; font-size: 1.05rem; color: var(--text); }
.jump-btn {
  margin-left: auto; display: inline-flex; align-items: center; gap: 0.4rem;
  background: none; border: 1px solid var(--border); color: var(--muted);
  border-radius: 6px; padding: 0.3rem 0.55rem; cursor: pointer; font-size: 0.8rem;
}
.jump-btn:hover { border-color: var(--accent); color: var(--text); }
.jump-hint { font-family: var(--font-mono); font-size: 0.72rem; }
.theme-btn {
  display: inline-flex; align-items: center;
  background: none; border: 1px solid var(--border); color: var(--muted);
  border-radius: 6px; padding: 0.3rem 0.45rem; cursor: pointer;
}
.theme-btn:hover { border-color: var(--accent); color: var(--text); }
@media (max-width: 32rem) { .jump-hint { display: none; } }
.scroll-progress {
  position: absolute; left: 0; bottom: -1px; height: 2px;
  background: var(--accent); transition: width 0.1s linear; will-change: width;
}

.body { display: block; }
.sidebar {
  position: fixed; inset: 3rem 0 0 0; z-index: 15;
  background: rgba(0, 0, 0, 0.5);
  display: none;
}
.body.nav-open .sidebar { display: block; }
.sidebar > * {
  width: min(20rem, 85vw); height: 100%;
  background: var(--panel); border-right: 1px solid var(--border);
  overflow-y: auto; padding: 1rem;
}
.content {
  max-width: var(--max);
  margin: 0 auto;
  padding: 1.5rem 1.1rem 5rem;
}

/* Desktop: persistent sidebar */
@media (min-width: 60rem) {
  .menu-btn { display: none; }
  .body { display: grid; grid-template-columns: 20rem 1fr; }
  .sidebar {
    position: sticky; top: 3rem; inset: auto;
    display: block; background: none;
    height: calc(100vh - 3rem);
  }
  .sidebar > * {
    width: auto; border-right: 1px solid var(--border);
  }
  .content { margin: 0; padding: 2rem 2.5rem 6rem; }
}
</style>
