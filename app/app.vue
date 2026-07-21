<script setup lang="ts">
// Global shell: mobile-first, single-column reading layout with a slide-in nav.
const navOpen = ref(false)
const { theme, toggle } = useTheme()

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
  </div>
</template>

<style>
:root {
  color-scheme: dark;

  /* Surfaces */
  --bg: #14161a;
  --panel: #1c1f26;
  --panel-2: #0e1013;      /* code blocks / insets */
  --border: #2a2e37;

  /* Ink */
  --text: #e6e8ec;
  --muted: #9aa1ad;
  --faint: #6b7280;

  /* Brand / interactive (validated: 4.98:1 on bg, 4.53:1 on panel — AA text) */
  --accent: #3987e5;
  --accent-soft: rgba(57, 135, 229, 0.15);
  --on-accent: #0b1220;    /* ink on an accent fill */

  /* Reading-state + status — RESERVED, always paired with a glyph or label,
     never color alone (see StatusDot). Hues validated for the dark surface. */
  --good: #0ca30c;         /* done · committed · fixed */
  --good-soft: rgba(12, 163, 12, 0.16);
  --on-good: #06210f;
  --warning: #fab219;      /* caution (status; ships with icon/label) */
  --serious: #ec835a;      /* planning · investigating */
  --critical: #d03b3b;     /* failure */
  --on-critical: #ffffff;
  --neutral: #3a3f4a;      /* unread / inert */

  /* Diagram roles — a validated categorical pair (server ↔ browser) */
  --role-server: #d95926;
  --role-browser: var(--accent);

  --max: 46rem;
}

/* Light theme — a SELECTED set (not an auto-flip). Each hue re-validated against
   the light surfaces: status tokens double as badge text, so they clear AA 4.5:1
   as text on #fff/#f5f7fa; the on-* inks flip to white for the darker fills. */
:root[data-theme='light'] {
  color-scheme: light;

  --bg: #f5f7fa;
  --panel: #ffffff;
  --panel-2: #eef1f5;
  --border: #d8dee6;

  --text: #1a1d23;
  --muted: #5a626e;
  --faint: #8b93a1;

  --accent: #2068c5;                       /* 5.46:1 on panel, 5.09:1 on bg */
  --accent-soft: rgba(32, 104, 197, 0.12);
  --on-accent: #ffffff;

  --good: #0a7a12;                         /* 5.52:1 text; white on it 5.52:1 */
  --good-soft: rgba(10, 122, 18, 0.12);
  --on-good: #ffffff;
  --warning: #b07400;
  --serious: #b54e1d;                      /* 5.16:1 on panel, 4.81:1 on bg */
  --critical: #cf2b2b;                     /* 5.21:1 on panel */
  --on-critical: #ffffff;
  --neutral: #5f6875;                      /* white text 5.64:1 */

  --role-server: #d95926;
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
  font: 16px/1.65 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

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
.brand { font-weight: 600; color: var(--text); }
.theme-btn {
  margin-left: auto; display: inline-flex; align-items: center;
  background: none; border: 1px solid var(--border); color: var(--muted);
  border-radius: 6px; padding: 0.3rem 0.45rem; cursor: pointer;
}
.theme-btn:hover { border-color: var(--accent); color: var(--text); }
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
