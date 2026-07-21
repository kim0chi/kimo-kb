// Light/dark theme, persisted to localStorage and reflected on <html data-theme>.
// The actual initial value is set pre-paint by an inline head script (nuxt.config)
// to avoid a flash; this composable just mirrors and toggles it.
export type Theme = 'dark' | 'light'

export function useTheme() {
  const theme = useState<Theme>('kb-theme', () => 'dark')

  onMounted(() => {
    const attr = document.documentElement.dataset.theme
    theme.value = attr === 'light' ? 'light' : 'dark'
  })

  function toggle() {
    const next: Theme = theme.value === 'dark' ? 'light' : 'dark'
    theme.value = next
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('kb-theme', next)
    } catch {
      /* private mode / storage disabled — theme just won't persist */
    }
  }

  return { theme, toggle }
}
