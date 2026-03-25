import { createContext } from 'react'

export const themes = ['night', 'coffee', 'dim', 'nord', 'cupcake', 'sunset', 'business'] as const
export type ThemeName = (typeof themes)[number]

export interface ThemeContextValue {
  theme: ThemeName
  themes: readonly ThemeName[]
  setTheme: (theme: ThemeName) => void
}

export const storageKey = 'annotations-theme'
export const ThemeContext = createContext<ThemeContextValue | null>(null)
