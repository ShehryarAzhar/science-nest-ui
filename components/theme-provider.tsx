"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

// Light, dark or system (default), saved in localStorage and applied as the
// .dark class on <html> before first paint
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
