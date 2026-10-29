"use client"

import { useEffect, useRef } from "react"
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
import {
  scheduleQueryKey,
  trialLessonQueryKey,
  type Schedule,
  type ScheduleTrialLesson,
} from "@/lib/schedule"
import { StudentApiError, studentFetch } from "@/lib/student-api"
import { formatTrialDateTime } from "@/lib/time-zone"
import { TrialLockedNotice } from "./trial-lesson-card"

// A 404 means the trial is already gone (cancelled in admin or another
// tab): the same outcome for the student, so it isn't an error
async function cancelTrial(id: number): Promise<"cancelled" | "gone"> {
  try {
    await studentFetch<unknown>(`/api/student/trial-lessons/${id}`, {
      method: "DELETE",
    })
    return "cancelled"
  } catch (error) {
    if (error instanceof StudentApiError && error.status === 404) return "gone"
    throw error
  }
}

// The dashboard's confirm dialog for the trial lesson (spec 30), built like
// DeleteClassDialog. `target` stays set through the close animation so the
// content doesn't empty while it fades; the parent clears it in onClosed. A
// 403 means the trial is locked (spec 31): the lock notice replaces the
// error, and only Close is left
export function CancelTrialDialog({
  target,
  timeZone,
  open,
  onClose,
  onClosed,
  finalFocus,
}: {
  target: ScheduleTrialLesson | null
  timeZone: string
  open: boolean
  onClose: () => void
  onClosed: () => void
  finalFocus: () => HTMLElement | null
}) {
  const queryClient = useQueryClient()
  const keepRef = useRef<HTMLButtonElement>(null)
  // One request per confirm, however fast the clicks
  const cancelling = useRef(false)
  const mutation = useMutation({ mutationFn: cancelTrial })
  const pending = mutation.isPending

  async function confirm() {
    if (!target || cancelling.current) return
    cancelling.current = true
    const { id } = target

    let outcome: "cancelled" | "gone"
    try {
      outcome = await mutation.mutateAsync(id)
    } catch (error) {
      cancelling.current = false
      if (error instanceof StudentApiError && error.status === 403) {
        // The card behind shows the lock once the refetch lands
        void queryClient.invalidateQueries({ queryKey: scheduleQueryKey })
        void queryClient.invalidateQueries({
          queryKey: trialLessonQueryKey(id),
          refetchType: "none",
        })
      }
      return
    }

    // Gone from the schedule as the dialog closes, then confirmed by the
    // refetch
    queryClient.setQueryData<Schedule>(scheduleQueryKey, (schedule) =>
      schedule && { ...schedule, trial_lesson: null },
    )
    void queryClient.invalidateQueries({ queryKey: scheduleQueryKey })
    // Not read on the dashboard: it refetches on its next mount
    void queryClient.invalidateQueries({
      queryKey: availabilityQueryKey,
      refetchType: "none",
    })
    // Removed, not invalidated: the edit page shows the form while it has
    // data, and a refetch's 404 would keep the old data
    queryClient.removeQueries({ queryKey: trialLessonQueryKey(id) })
    onClose()
    if (outcome === "cancelled") toast.success("Trial lesson cancelled.")
    else toast("This trial lesson was already cancelled.")
  }

  const error = mutation.error
  const locked = error instanceof StudentApiError && error.status === 403
  const errorMessage =
    error && !locked
      ? error instanceof StudentApiError
        ? error.message
        : GENERIC_ERROR_MESSAGE
      : null

  // The confirm button that had focus is gone, so Close takes it
  useEffect(() => {
    if (locked) keepRef.current?.focus()
  }, [locked])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose()
      }}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen) return
        cancelling.current = false
        mutation.reset()
        onClosed()
      }}
      disablePointerDismissal={pending}
    >
      <DialogContent initialFocus={keepRef} finalFocus={finalFocus}>
        <DialogHeader>
          <DialogTitle>Cancel free trial?</DialogTitle>
          {/* Not once it's locked: the trial can no longer be cancelled */}
          {!locked && (
            <DialogDescription>
              Its hour is released and this can&apos;t be undone. You can
              book a new free trial later, at least 24 hours ahead, if a time
              is still free.
            </DialogDescription>
          )}
        </DialogHeader>

        {target && <TrialSummary trialLesson={target} timeZone={timeZone} />}

        {/* Margins, not a gap: the notice's live region is always mounted */}
        <div>
          <TrialLockedNotice show={locked} className="mb-4" />
          {errorMessage && (
            <p
              role="alert"
              className="mb-4 whitespace-pre-line text-destructive"
            >
              {errorMessage}
            </p>
          )}
          <DialogFooter>
            <DialogClose
              ref={keepRef}
              disabled={pending}
              render={<Button variant="outline" size="lg" />}
            >
              {locked ? "Close" : "Keep trial lesson"}
            </DialogClose>
            {!locked && (
              <Button
                variant="destructive"
                size="lg"
                disabled={pending}
                onClick={() => void confirm()}
              >
                {pending ? "Cancelling…" : "Cancel trial lesson"}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// The trial as its card shows it, with the card's eosin rule
function TrialSummary({
  trialLesson,
  timeZone,
}: {
  trialLesson: ScheduleTrialLesson
  timeZone: string
}) {
  return (
    <div className="rounded-sm border border-border border-l-[3px] border-l-eosin px-3 py-2">
      <p className="font-semibold wrap-anywhere">{trialLesson.subject.name}</p>
      <p className="text-sm text-muted-foreground">{trialLesson.level.name}</p>
      <p className="mt-1 tabular-nums">
        {formatTrialDateTime(trialLesson.starts_at, timeZone)}
      </p>
    </div>
  )
}
