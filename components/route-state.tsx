import type { ReactNode, Ref } from "react"

import { cn } from "@/lib/utils"

// Shared layout for the root not-found, error and global-error pages: a
// centred column, vertically centred where there's room. The message and
// actions are the point, so spacing is functional-page sized and media must
// size itself to the viewport height (see app/not-found.tsx), never pushing
// them below the fold
export function RouteState({
  media,
  heading,
  headingRef,
  description,
  descriptionRole,
  actions,
  footnote,
  className,
}: {
  media?: ReactNode
  heading: string
  // Set by error states, which move focus to the heading
  headingRef?: Ref<HTMLHeadingElement>
  description: ReactNode
  descriptionRole?: "alert"
  actions: ReactNode
  footnote?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-10 text-center md:px-6 md:py-12",
        className,
      )}
    >
      {/* media sets its own bottom margin, so hiding it removes the gap too */}
      {media}
      <h1
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className="text-xl md:text-2xl focus:outline-none"
      >
        {heading}
      </h1>
      <p
        role={descriptionRole}
        className="mt-3 max-w-[65ch] text-muted-foreground"
      >
        {description}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>
      {footnote && (
        <p className="mt-6 text-sm text-muted-foreground tabular-nums select-text">
          {footnote}
        </p>
      )}
    </div>
  )
}

// 44px tall so the actions meet the touch-target size on mobile
export const routeActionClass = "h-11 px-4 text-base"
