<script setup lang="ts">
// Global shell: mobile-first, single-column reading layout with a slide-in nav.
const navOpen = ref(false)
</script>

<template>
  <div class="app">
    <header class="topbar">
      <button class="menu-btn" aria-label="Toggle navigation" @click="navOpen = !navOpen">
        ☰
      </button>
      <NuxtLink to="/" class="brand">SI Handbook</NuxtLink>
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
  --bg: #14161a;
  --panel: #1c1f26;
  --border: #2a2e37;
  --text: #e6e8ec;
  --muted: #9aa1ad;
  --accent: #6ea8fe;
  --done: #3fb950;
  --max: 46rem;
}
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
