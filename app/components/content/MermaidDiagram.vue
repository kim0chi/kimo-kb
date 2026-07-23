<script setup lang="ts">
// Renders a ```mermaid``` block (rewritten to <mermaid-diagram> by remark-mermaid)
// as an SVG. Mermaid needs the DOM and is heavy, so it's dynamically imported and
// only runs client-side (in onMounted) — pages without a diagram never load it.
// Themed from the app's palette, including the CVD-safe teal↔terracotta diagram
// roles, and re-rendered when the light/dark theme flips.
const props = defineProps<{ code: string }>()

const host = ref<HTMLElement | null>(null)
const ready = ref(false)
const failed = ref(false)
let seq = 0

function palette() {
  const s = getComputedStyle(document.documentElement)
  const v = (name: string) => s.getPropertyValue(name).trim()
  return {
    startOnLoad: false,
    securityLevel: 'strict' as const,
    theme: 'base' as const,
    themeVariables: {
      background: 'transparent',
      primaryColor: v('--panel-2'),
      primaryTextColor: v('--text'),
      primaryBorderColor: v('--role-browser'),
      secondaryColor: v('--role-server'),
      tertiaryColor: v('--panel'),
      lineColor: v('--muted'),
      textColor: v('--text'),
      fontFamily: v('--font-sans') || 'inherit',
      fontSize: '14px',
    },
  }
}

async function render() {
  const el = host.value
  if (!el) return
  try {
    const { default: mermaid } = await import('mermaid')
    mermaid.initialize(palette())
    // A fresh id each render; mermaid injects a matching <style> keyed to it.
    const { svg } = await mermaid.render(`kb-mermaid-${Date.now()}-${seq++}`, props.code)
    el.innerHTML = svg
    failed.value = false
  } catch {
    // Bad syntax or load failure — fall back to the source so nothing is lost.
    failed.value = true
    el.innerHTML = ''
  } finally {
    ready.value = true
  }
}

let observer: MutationObserver | null = null
onMounted(() => {
  render()
  // Re-render when the light/dark theme flips (data-theme on <html>).
  observer = new MutationObserver(() => render())
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="mermaid-block">
    <div v-show="ready && !failed" ref="host" class="mermaid-svg" />
    <p v-if="!ready" class="mermaid-loading">Rendering diagram…</p>
    <template v-if="failed">
      <p class="mermaid-error">Couldn't render this diagram — showing its source:</p>
      <pre class="mermaid-source"><code>{{ props.code }}</code></pre>
    </template>
  </div>
</template>

<style scoped>
.mermaid-block { margin: 1.5rem 0; }
.mermaid-svg {
  display: flex; justify-content: center;
  border: 1px solid var(--border); border-radius: 10px;
  background: var(--panel); padding: 1.25rem 1rem; overflow-x: auto;
}
.mermaid-svg :deep(svg) { max-width: 100%; height: auto; }
.mermaid-loading { color: var(--faint); font-size: 0.85rem; font-style: italic; }
.mermaid-error { color: var(--serious); font-size: 0.85rem; margin: 0 0 0.4rem; }
.mermaid-source {
  background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px;
  padding: 0.85rem 1rem; overflow-x: auto; font-family: var(--font-mono); font-size: 0.82rem; margin: 0;
}
</style>
