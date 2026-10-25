"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const MAX_RETRIES = 2

// A 4xx means the request itself is wrong, so only 408 and 429 are worth
// repeating. Errors without a numeric status (network, timeout) and 5xx retry
function isRetryable(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return true
  }
  const { status } = error
  if (typeof status !== "number" || status < 400 || status > 499) {
    return true
  }
  return status === 408 || status === 429
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          isRetryable(error) && failureCount < MAX_RETRIES,
        // Shared default; availability (spec 22) overrides it so pickers
        // refetch when they open
        staleTime: 30_000,
      },
      // Resending a booking could book it twice
      mutations: { retry: false },
    },
  })
}

let browserQueryClient: QueryClient | undefined

// A new client per server render, one client for the whole browser session
function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient()
  }
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>
  )
}
