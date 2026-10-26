import { cn } from "@/lib/utils"

// Pricing context next to the subjects: eosin marks the trial lesson
export function FreeTrialNote({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center gap-2", className)}>
      <svg viewBox="0 0 12 12" aria-hidden className="size-3 shrink-0 fill-eosin">
        <path d="M6 0.5 10.76 3.25V8.75L6 11.5 1.24 8.75V3.25Z" />
      </svg>
      Your first lesson is a free 60-minute trial.
    </p>
  )
}
