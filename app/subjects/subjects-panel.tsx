import type { ReactNode, Ref } from "react"

// Shared frame for the empty and error states that replace the subject grid,
// or the whole subject on a detail page (which then needs the page's h1).
// `headingRef` makes the heading focusable, for states that replace a form
export function SubjectsPanel({
  icon,
  heading,
  headingLevel: Heading = "h2",
  headingRef,
  children,
  role,
}: {
  icon: ReactNode
  heading: string
  headingLevel?: "h1" | "h2" | "h3"
  headingRef?: Ref<HTMLHeadingElement>
  children: ReactNode
  role?: "alert"
}) {
  return (
    <div role={role} className="rounded-lg bg-muted p-6 md:p-8">
      <Heading
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className={
          headingRef
            ? "flex items-center gap-3 text-lg outline-none"
            : "flex items-center gap-3 text-lg"
        }
      >
        {icon}
        {heading}
      </Heading>
      <div className="mt-2 max-w-[65ch] text-muted-foreground">{children}</div>
    </div>
  )
}
