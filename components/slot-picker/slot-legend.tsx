import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// The four slot states, drawn like the cells themselves
const ITEMS = [
  { label: "Available", swatch: "border border-border bg-card" },
  { label: "Taken", swatch: "slot-hatch border border-border" },
  { label: "Yours", swatch: "border-2 border-eosin bg-card", dot: true },
  {
    label: "Selected",
    swatch: "border border-primary bg-primary text-primary-foreground",
    check: true,
  },
]

export function SlotLegend({ className }: { className?: string }) {
  return (
    <ul
      aria-label="Key"
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground",
        className,
      )}
    >
      {ITEMS.map(({ label, swatch, dot, check }) => (
        <li key={label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "flex size-5 items-center justify-center rounded-sm",
              swatch,
            )}
          >
            {dot && <span className="size-1.5 rounded-full bg-eosin" />}
            {check && <CheckIcon className="size-3.5" />}
          </span>
          {label}
        </li>
      ))}
    </ul>
  )
}
