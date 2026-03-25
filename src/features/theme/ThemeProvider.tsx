import { useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { ThemeContext, themes, type ThemeContextValue, type ThemeName, storageKey } from './theme-context'

function getInitialTheme(): ThemeName {
  if (typeof window === 'undefined') {
    return 'night'
  }

  const savedTheme = window.localStorage.getItem(storageKey) as ThemeName | null
  return savedTheme && themes.includes(savedTheme) ? savedTheme : 'night'
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<ThemeName>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(storageKey, theme)
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themes,
      setTheme: (nextTheme) => setThemeState(nextTheme),
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
