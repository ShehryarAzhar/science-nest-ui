import type { SubjectLevel } from "@/lib/subjects"
import { cn } from "@/lib/utils"

// The subject's levels as badges, shown by the backend's `name`
export function LevelBadges({
  levels,
  className,
}: {
  levels: SubjectLevel[]
  className?: string
}) {
  return (
    <ul aria-label="Levels" className={cn("flex flex-wrap gap-2", className)}>
      {levels.map((level) => (
        <li
          key={level.code}
          className="rounded-full bg-secondary px-2.5 py-0.5 text-sm text-secondary-foreground"
        >
          {level.name}
        </li>
      ))}
    </ul>
  )
}
