import { useEffect } from 'react'
import type { ThemePreference } from '@/types'

/** Applies the resolved theme as a `.dark` class on the popup root, tracking the OS setting when `theme === 'system'`. */
export function useTheme(theme: ThemePreference): void {
  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches)
      root.classList.toggle('dark', isDark)
    }

    apply()

    if (theme === 'system') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
    return undefined
  }, [theme])
}
