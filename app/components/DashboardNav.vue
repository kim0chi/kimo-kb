<script setup lang="ts">
import { House, GraduationCap, ListTodo, LibraryBig, Palette, Lightbulb, PlugZap, NotebookPen, BookText, Wallet } from '@lucide/vue'
const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const links = [
  { to: '/', label: 'Today', icon: House },
  { to: '/learn', label: 'Learn', icon: GraduationCap },
  { to: '/work', label: 'Work', icon: ListTodo },
  { to: '/library', label: 'Library', icon: LibraryBig },
  { to: '/studio', label: 'Studio', icon: Palette },
]
</script>

<template>
  <nav class="dash-nav" aria-label="Primary navigation">
    <div class="nav-eyebrow">Your workspace</div>
    <NuxtLink v-for="link in links" :key="link.to" :to="link.to" class="dash-link" active-class="selected" @click="emit('navigate')">
      <component :is="link.icon" :size="18" :stroke-width="1.8" aria-hidden="true" />
      <span>{{ link.label }}</span>
    </NuxtLink>
    <div class="nav-divider" />
    <div class="nav-eyebrow">Keep in view</div>
    <NuxtLink to="/journal" class="dash-link" active-class="selected" @click="emit('navigate')"><NotebookPen :size="18" aria-hidden="true" /> <span>Learning journal</span></NuxtLink>
    <NuxtLink to="/briefs" class="dash-link" :class="{ selected: route.path.startsWith('/briefs') || route.path === '/ask' }" @click="emit('navigate')"><BookText :size="18" aria-hidden="true" /> <span>Guides</span></NuxtLink>
    <NuxtLink to="/ideas" class="dash-link" active-class="selected" @click="emit('navigate')"><Lightbulb :size="18" aria-hidden="true" /> <span>Ideas</span></NuxtLink>
    <NuxtLink to="/money" class="dash-link" active-class="selected" @click="emit('navigate')"><Wallet :size="18" aria-hidden="true" /> <span>Money</span></NuxtLink>
    <NuxtLink to="/connections" class="dash-link" active-class="selected" @click="emit('navigate')"><PlugZap :size="18" aria-hidden="true" /> <span>Connections</span></NuxtLink>
    <p class="nav-note">Make sense of the work as you do it.</p>
  </nav>
</template>

<style scoped>
.dash-nav { display: flex; flex-direction: column; gap: .2rem; }
.nav-eyebrow { padding: .55rem .8rem .35rem; color: var(--faint); font-size: .68rem; letter-spacing: .12em; text-transform: uppercase; font-weight: 700; }
.dash-link { display: flex; align-items: center; gap: .8rem; min-height: 2.7rem; padding: .55rem .8rem; border-radius: .6rem; color: var(--muted); font-size: .9rem; font-weight: 500; }
.dash-link:hover { background: var(--accent-soft); color: var(--text); text-decoration: none; }
.dash-link.selected { background: var(--accent-soft); color: var(--accent); font-weight: 700; }
.nav-divider { height: 1px; background: var(--border); margin: 1rem .8rem; }
.nav-note { color: var(--faint); padding: 1rem .8rem; font-family: var(--font-serif); font-size: .83rem; line-height: 1.45; }
</style>
