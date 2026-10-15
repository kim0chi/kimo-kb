<script setup lang="ts">
// Small, deliberately non-executable Markdown subset. No raw HTML or Vue components.
const props = defineProps<{ content: string }>()
const blocks = computed(() => {
  const result: { tag: string; text: string; items?: string[] }[] = []
  let paragraph: string[] = [], code: string[] | null = null
  const flush = () => { if (paragraph.length) result.push({ tag: 'p', text: paragraph.join('\n') }); paragraph = [] }
  for (const line of props.content.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) { flush(); if (code) { result.push({ tag: 'pre', text: code.join('\n') }); code = null } else code = []; continue }
    if (code) { code.push(line); continue }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    const bullet = /^\s*(?:[-*+] |\d+\. )(.+)$/.exec(line)
    if (heading) { flush(); result.push({ tag: heading[1].length < 3 ? 'h3' : 'h4', text: heading[2] }) }
    else if (bullet) {
      flush(); const last = result[result.length - 1]
      if (last?.tag === 'ul') last.items!.push(bullet[1])
      else result.push({ tag: 'ul', text: '', items: [bullet[1]] })
    } else if (!line.trim()) flush()
    else paragraph.push(line)
  }
  flush(); if (code) result.push({ tag: 'pre', text: code.join('\n') })
  return result
})
function inline(text: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).map(part => {
    const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part)
    if (link) return { tag: 'a', text: link[1], href: link[2] }
    if (part.startsWith('`') && part.endsWith('`')) return { tag: 'code', text: part.slice(1,-1) }
    if (part.startsWith('**') && part.endsWith('**')) return { tag: 'strong', text: part.slice(2,-2) }
    return { tag: 'span', text: part }
  })
}
</script>
<template><div class="artifact-text"><template v-for="(block, i) in blocks" :key="i"><pre v-if="block.tag === 'pre'"><code>{{ block.text }}</code></pre><ul v-else-if="block.tag === 'ul'"><li v-for="(item,j) in block.items" :key="j"><component :is="part.tag" v-for="(part,k) in inline(item)" :key="k" :href="part.href" :rel="part.href ? 'noopener noreferrer' : undefined">{{ part.text }}</component></li></ul><component :is="block.tag" v-else><component :is="part.tag" v-for="(part,k) in inline(block.text)" :key="k" :href="part.href" :rel="part.href ? 'noopener noreferrer' : undefined">{{ part.text }}</component></component></template></div></template>
<style scoped>
.artifact-text{max-width:72ch;min-width:0;font-size:1rem;line-height:1.75;overflow-wrap:anywhere}.artifact-text p{margin:0 0 1.2rem;white-space:pre-wrap}.artifact-text h3{font:600 1.3rem/1.3 var(--font-ui);margin:2rem 0 .65rem}.artifact-text h4{font:600 1.08rem/1.4 var(--font-ui);margin:1.6rem 0 .5rem}.artifact-text>:first-child{margin-top:0}.artifact-text ul{list-style:disc;margin:.5rem 0 1.3rem;padding-left:1.3rem}.artifact-text li{padding:.2rem 0}.artifact-text code{font-family:var(--font-mono);font-size:.86em;background:var(--panel-2);padding:.08em .25em;border-radius:3px}.artifact-text pre{max-width:100%;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:1rem;background:var(--panel-2);white-space:pre;line-height:1.55;margin:1.3rem 0}.artifact-text pre code{padding:0;background:none}.artifact-text a{text-decoration:underline;text-underline-offset:.2em}
</style>
