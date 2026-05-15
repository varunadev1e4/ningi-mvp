import { create } from 'zustand'

const STORAGE_KEY = 'ningi_theme'

// Read saved preference, default to 'dark'
const saved = (() => {
  try { return localStorage.getItem(STORAGE_KEY) || 'dark' } catch { return 'dark' }
})()

export const useThemeStore = create((set, get) => ({
  theme: saved,   // 'light' | 'dark'

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    set({ theme: next })
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    applyTheme(next)
  },

  initTheme: () => {
    applyTheme(get().theme)
  },
}))

function applyTheme(theme) {
  const el = document.documentElement
  if (theme === 'dark') {
    el.classList.add('dark')
    el.classList.remove('light')
  } else {
    el.classList.add('light')
    el.classList.remove('dark')
  }
}
