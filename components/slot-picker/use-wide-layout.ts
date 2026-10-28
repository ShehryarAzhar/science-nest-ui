"use client"

import { useSyncExternalStore } from "react"

// Tailwind's lg. Read in JS, not only CSS, because the picker's keyboard
// rows need the same column count as the visible grid
const QUERY = "(min-width: 64rem)"

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

export function useWideLayout(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
