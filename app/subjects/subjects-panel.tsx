import type { ReactNode } from "react"

// Shared frame for the empty and error states that replace the subject grid
export function SubjectsPanel({
  icon,
  heading,
  children,
  role,
}: {
  icon: ReactNode
  heading: string
  children: ReactNode
  role?: "alert"
}) {
  return (
    <div role={role} className="rounded-lg bg-muted p-6 md:p-8">
      <h2 className="flex items-center gap-3 text-lg">
        {icon}
        {heading}
      </h2>
      <div className="mt-2 max-w-[65ch] text-muted-foreground">{children}</div>
    </div>
  )
}
