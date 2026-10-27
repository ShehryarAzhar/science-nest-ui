import { CheckIcon } from "lucide-react"

import { subjectOfferings } from "@/lib/subject-offerings"
import type { SubjectLevel } from "@/lib/subjects"

// What the subject offers, from its levels. A plain checked list, so it reads
// as "what's included" and never as more level badges
export function SubjectOfferings({ levels }: { levels: SubjectLevel[] }) {
  const offerings = subjectOfferings(levels)

  if (offerings.length === 0) {
    return null
  }

  return (
    <ul aria-label="What's included" className="flex flex-col gap-1 text-sm">
      {offerings.map((offering) => (
        <li key={offering} className="flex items-center gap-2">
          <CheckIcon aria-hidden className="size-4 shrink-0 text-primary" />
          {offering}
        </li>
      ))}
    </ul>
  )
}
