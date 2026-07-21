// Shared open-state for the ⌘K quick-jump palette, so both the global keyboard
// shortcut and the topbar button can drive it.
export function useQuickJump() {
  const open = useState('qj-open', () => false)
  return {
    open,
    toggle: () => (open.value = !open.value),
    show: () => (open.value = true),
    hide: () => (open.value = false),
  }
}
