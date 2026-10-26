"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

// The page's query string, read only in the browser: the server render and
// the first client render see "", so /login stays static and hydrates cleanly
export function useLocationSearch(): URLSearchParams {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  )
  return new URLSearchParams(search)
}
