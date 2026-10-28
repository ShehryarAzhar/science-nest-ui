import type { ComponentProps } from "react"
import { CheckIcon } from "lucide-react"

import type { SlotAvailability } from "@/lib/availability"
import { cn } from "@/lib/utils"

// One slot in a picker (CLAUDE.md › Design › Slot pickers), never colour
// alone: taken has the hatch and "Taken", yours the eosin outline, dot and
// "Yours", selected the check. A radio whose arrows only move focus
// (useRovingGrid), so blocked cells stay focusable but aria-disabled

type CellState = SlotAvailability | "loading" | "selected"

const STATE_NAMES: Record<SlotAvailability, string> = {
  free: "available",
  taken: "taken",
  mine: "yours",
  own: "yours",
}

const STATE_CLASSES: Record<CellState, string> = {
  free: "border-border bg-card",
  taken: "slot-hatch border-border text-muted-foreground",
  mine: "border-2 border-eosin bg-card",
  own: "border-2 border-eosin bg-card",
  selected: "border-primary bg-primary text-primary-foreground",
  loading: "border-transparent bg-muted text-muted-foreground",
}

export function SlotCell({
  name,
  timeText,
  offsetText,
  availability,
  selected,
  disabled,
  onSelect,
  className,
  ...props
}: Omit<ComponentProps<"button">, "name" | "onSelect" | "disabled"> & {
  // Weekday and time (plus the offset where needed), read before the state
  name: string
  // Visible time, for layouts without a time column (mobile)
  timeText?: string
  // Visible UTC offset when two slots share a local time
  offsetText?: string
  // null while availability loads
  availability: SlotAvailability | null
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const selectable =
    !disabled && (availability === "free" || availability === "own")
  const state: CellState =
    availability === null ? "loading" : selected ? "selected" : availability
  const yours = state === "mine" || state === "own"
  // Two slots in one cell leave room for the offset only; the hatch, dot
  // and check still mark the state
  const compact = offsetText !== undefined && timeText === undefined

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={!selectable || undefined}
      aria-label={`${name}, ${availability ? STATE_NAMES[availability] : "checking availability"}`}
      data-state={state}
      onClick={() => {
        if (selectable && !selected) onSelect()
      }}
      className={cn(
        "flex w-full min-w-0 items-center justify-center gap-1 rounded-sm border text-sm transition-colors motion-reduce:transition-none",
        STATE_CLASSES[state],
        selectable ? "cursor-pointer" : "cursor-default",
        selectable && !selected && "hover:border-primary",
        className,
      )}
      {...props}
    >
      {timeText && <span className="tabular-nums">{timeText}</span>}
      {offsetText && <span className="tabular-nums">{offsetText}</span>}
      {state === "selected" && <CheckIcon className="size-4 shrink-0" />}
      {state === "taken" && !compact && (
        <span className="rounded-full bg-muted px-1.5">Taken</span>
      )}
      {yours && (
        <span className="flex items-center gap-1">
          <span className="size-1.5 shrink-0 rounded-full bg-eosin" />
          {!compact && "Yours"}
        </span>
      )}
    </button>
  )
}
