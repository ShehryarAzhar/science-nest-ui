import type { ReactNode } from "react"

// The page frame and heading, shared by the loading, details and error
// states. The student access guard's states replace it, since they carry
// their own layout and h1. No hooks, so the client error boundary can use it
export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <h1 className="text-2xl md:text-3xl">Account</h1>
      <div className="mt-6 max-w-2xl md:mt-8">{children}</div>
    </div>
  )
}
