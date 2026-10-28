"use client"

import { useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/sonner"
import { availabilityQueryKey } from "@/lib/availability"
import { GENERIC_ERROR_MESSAGE } from "@/lib/drf-errors"
import { formatUsd } from "@/lib/format-usd"
import {
  scheduleQueryKey,
  weeklyClassQueryKey,
  type Schedule,
} from "@/lib/schedule"
import { StudentApiError, studentFetch } from "@/lib/student-api"
import { formatTimeRange, formatWeekday } from "@/lib/time-zone"
import type { LocalClass } from "./local-schedule"

// A 404 means the class is already gone (deleted in admin or another tab):
// the same outcome for the student, so it isn't an error
async function deleteClass(id: number): Promise<"deleted" | "gone"> {
  try {
    await studentFetch<unknown>(`/api/student/classes/${id}`, {
      method: "DELETE",
    })
    return "deleted"
  } catch (error) {
    if (error instanceof StudentApiError && error.status === 404) return "gone"
    throw error
  }
}

// The one confirm dialog for the dashboard (spec 27). `target` stays set
// through the close animation so the content doesn't empty while it fades;
// the parent clears it in onClosed
export function DeleteClassDialog({
  target,
  open,
  onClose,
  onClosed,
  finalFocus,
}: {
  target: LocalClass | null
  open: boolean
  onClose: () => void
  onClosed: () => void
  finalFocus: () => HTMLElement | null
}) {
  const queryClient = useQueryClient()
  const keepRef = useRef<HTMLButtonElement>(null)
  // One request per confirm, however fast the clicks
  const deleting = useRef(false)
  const mutation = useMutation({ mutationFn: deleteClass })
  const pending = mutation.isPending

  async function confirm() {
    if (!target || deleting.current) return
    deleting.current = true
    const { id, price } = target.weeklyClass

    let outcome: "deleted" | "gone"
    try {
      outcome = await mutation.mutateAsync(id)
    } catch {
      deleting.current = false
      return
    }

    // Gone from the schedule as the dialog closes; the refetch then brings
    // the backend's own weekly cost
    queryClient.setQueryData<Schedule>(scheduleQueryKey, (schedule) =>
      schedule && {
        ...schedule,
        weekly_classes: schedule.weekly_classes.filter((c) => c.id !== id),
        weekly_cost:
          outcome === "deleted"
            ? Math.max(0, Math.round((schedule.weekly_cost - price) * 100) / 100)
            : schedule.weekly_cost,
      },
    )
    void queryClient.invalidateQueries({ queryKey: scheduleQueryKey })
    // Not read on the dashboard: they refetch on their next mount
    void queryClient.invalidateQueries({
      queryKey: availabilityQueryKey,
      refetchType: "none",
    })
    void queryClient.invalidateQueries({
      queryKey: weeklyClassQueryKey(id),
      refetchType: "none",
    })
    onClose()
    if (outcome === "deleted") toast.success("Weekly class deleted.")
    else toast("This class was already deleted.")
  }

  const error = mutation.error
  const errorMessage = error
    ? error instanceof StudentApiError
      ? error.message
      : GENERIC_ERROR_MESSAGE
    : null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose()
      }}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen) return
        deleting.current = false
        mutation.reset()
        onClosed()
      }}
      disablePointerDismissal={pending}
    >
      <DialogContent initialFocus={keepRef} finalFocus={finalFocus}>
        <DialogHeader>
          <DialogTitle>Delete weekly class?</DialogTitle>
          <DialogDescription>
            Its time is released and this can&apos;t be undone. You can book
            the same time again only if it&apos;s still free.
          </DialogDescription>
        </DialogHeader>

        {target && <ClassSummary item={target} />}

        <div className="flex flex-col gap-4">
          {errorMessage && (
            <p role="alert" className="whitespace-pre-line text-destructive">
              {errorMessage}
            </p>
          )}
          <DialogFooter>
            <DialogClose
              ref={keepRef}
              disabled={pending}
              render={<Button variant="outline" size="lg" />}
            >
              Keep class
            </DialogClose>
            <Button
              variant="destructive"
              size="lg"
              disabled={pending}
              onClick={() => void confirm()}
            >
              {pending ? "Deleting…" : "Delete class"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// The class as the schedule shows it, so the student recognises it
function ClassSummary({ item }: { item: LocalClass }) {
  const { weeklyClass, local } = item
  return (
    <div className="flex items-start justify-between gap-4 rounded-sm border-l-[3px] border-primary bg-secondary px-3 py-2 text-secondary-foreground">
      <div className="min-w-0">
        <p className="font-semibold wrap-anywhere">{weeklyClass.subject.name}</p>
        <p className="text-sm">{weeklyClass.level.name}</p>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <p>
          {formatWeekday(local.day)}{" "}
          {formatTimeRange(local.hour, local.minute, weeklyClass.duration)}
        </p>
        <p className="text-sm">{formatUsd(weeklyClass.price)} a week</p>
      </div>
    </div>
  )
}
