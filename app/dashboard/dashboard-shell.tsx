import type { ReactNode } from "react"

// The page frame and heading, shared by the loading, schedule and error
// states. The student access guard's state replaces it, since it carries its
// own layout and h1
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <h1 className="text-2xl md:text-3xl">Dashboard</h1>
      <div className="mt-6 md:mt-8">{children}</div>
    </div>
  )
}
