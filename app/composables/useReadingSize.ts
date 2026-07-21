// Reader font-size preference, persisted and reflected on <html data-reading>.
// Drives the --reading-scale CSS var (see app.vue). Applied pre-paint by the same
// inline head script as the theme, so there's no flash.
export type ReadingSize = 'sm' | 'md' | 'lg' | 'xl'
const ORDER: ReadingSize[] = ['sm', 'md', 'lg', 'xl']

export function useReadingSize() {
  const size = useState<ReadingSize>('kb-reading', () => 'md')

  onMounted(() => {
    const a = document.documentElement.dataset.reading as ReadingSize | undefined
    if (a && ORDER.includes(a)) size.value = a
  })

  function set(s: ReadingSize) {
    size.value = s
    document.documentElement.dataset.reading = s
    try {
      localStorage.setItem('kb-reading', s)
    } catch {
      /* storage disabled — just won't persist */
    }
  }
  const i = () => ORDER.indexOf(size.value)
  function inc() {
    if (i() < ORDER.length - 1) set(ORDER[i() + 1])
  }
  function dec() {
    if (i() > 0) set(ORDER[i() - 1])
  }

  return {
    size,
    inc,
    dec,
    canInc: computed(() => i() < ORDER.length - 1),
    canDec: computed(() => i() > 0),
  }
}
