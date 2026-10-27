import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { SpecimenImage } from "@/components/specimen-image"
import { formatUsd } from "@/lib/format-usd"
import type { Subject } from "@/lib/subjects"
import { LevelBadges } from "./level-badges"

// One link per card, named by the heading inside it. h3 where the grid sits
// under a section heading (the home page)
export function SubjectCard({
  subject,
  headingLevel: Heading = "h2",
}: {
  subject: Subject
  headingLevel?: "h2" | "h3"
}) {
  const { name, slug, levels, price_40_min, price_60_min } = subject

  return (
    <li>
      <Link
        href={`/subjects/${slug}`}
        className="flex h-full flex-col gap-4 rounded-lg border border-border bg-card p-4 outline-none transition-colors duration-150 hover:border-primary focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none md:p-6"
      >
        <SpecimenImage
          src={`/images/subjects/${slug}.webp`}
          alt=""
          width={480}
          height={480}
          sizes="144px"
          className="mx-auto w-36"
          fallback={
            <div className="flex size-full items-center justify-center">
              <Logo variant="mark" height={64} decorative />
            </div>
          }
        />
        <Heading className="text-lg">{name}</Heading>
        <LevelBadges levels={levels} />
        <dl className="mt-auto grid grid-cols-2 gap-4 border-t border-border pt-4">
          <div>
            <dt className="text-sm text-muted-foreground">40 min</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {formatUsd(price_40_min)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">60 min</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {formatUsd(price_60_min)}
            </dd>
          </div>
        </dl>
      </Link>
    </li>
  )
}
