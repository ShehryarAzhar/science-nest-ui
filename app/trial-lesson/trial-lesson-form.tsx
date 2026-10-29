"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  AvailabilityRetry,
  availabilityFailed,
  ChoiceGroup,
  focusRef,
  FormAlert,
  LevelChoices,
  normalizeMutationError,
  PICKER_TAB_STOP,
  SlotTakenNotice,
  SubjectChoices,
  withoutMessage,
} from "@/app/classes/booking-form-parts"
import { SLOT_TAKEN_MESSAGE } from "@/app/classes/schema"
import {
  trialLessonFormSchema,
  type TrialLessonFormInput,
  type TrialLessonValues,
} from "@/app/trial-lesson/schema"
import { TrialSlotPicker } from "@/components/slot-picker/trial-slot-picker"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"
import { availabilityQueryKey, useTrialAvailability } from "@/lib/availability"
import { hasErrorMessage, type NormalizedError } from "@/lib/drf-errors"
import { applyServerErrors } from "@/lib/form-errors"
import {
  scheduleQueryKey,
  trialLessonQueryKey,
  trialLessonSchema,
  type Schedule,
  type ScheduleTrialLesson,
} from "@/lib/schedule"
import { studentFetch } from "@/lib/student-api"
import type { Subject } from "@/lib/subjects"
import { useLocationSearch } from "@/lib/use-location-search"
import { useOnTrialBooked } from "./new/trial-lesson-booking"

// Specs 28 and 29. Subject, level and a UTC starts_at, posted (booking) or
// patched (editing) through the student API proxy. Subjects come from the
// server; availability, local times and `?subject=` only exist in the
// browser

// On-screen order: the first one with an error gets focus
const FIELDS = ["subject", "level", "starts_at"] as const

const LABELS = {
  book: { submit: "Book free trial", pending: "Booking…", done: "Trial lesson booked." },
  edit: { submit: "Save changes", pending: "Saving…", done: "Trial lesson updated." },
}

type TrialLessonRequest = {
  subject: number
  level: string
  starts_at: string
}

// The loaded lesson as the form's starting values, checked against the
// current subject list as in the weekly class form: a subject no longer
// listed, or a level the subject no longer offers, starts unchosen (a
// single level is picked)
function prefill(
  editing: ScheduleTrialLesson | undefined,
  subjects: readonly Subject[],
): TrialLessonFormInput {
  if (!editing) return { subject: null, level: null, starts_at: null }
  const subject = subjects.find(({ id }) => id === editing.subject.id)
  let level: string | null = null
  if (subject?.levels.some(({ code }) => code === editing.level.code)) {
    level = editing.level.code
  } else if (subject?.levels.length === 1) {
    level = subject.levels[0].code
  }
  return {
    subject: subject ? subject.id : null,
    level,
    starts_at: editing.starts_at,
  }
}

// The lesson as just saved, from the values sent, so a page shown again
// starts from it rather than from the lesson as first loaded
function savedTrialLesson(
  editing: ScheduleTrialLesson,
  values: TrialLessonValues,
  subjects: readonly Subject[],
): ScheduleTrialLesson | undefined {
  const subject = subjects.find(({ id }) => id === values.subject)
  const level = subject?.levels.find(({ code }) => code === values.level)
  if (!subject || !level) return undefined
  return {
    id: editing.id,
    subject: {
      id: subject.id,
      name: subject.name,
      slug: subject.slug,
      levels: subject.levels.map(({ code, name }) => ({ code, name })),
    },
    level: { code: level.code, name: level.name },
    starts_at: values.starts_at,
    completed: editing.completed,
  }
}

export function TrialLessonForm({
  subjects,
  editing,
  onLocked,
}: {
  subjects: readonly Subject[]
  // The trial lesson being edited (spec 29); booking when absent
  editing?: ScheduleTrialLesson
  // Editing only: the backend refused the save with a 403, the trial lesson
  // having started or been completed (spec 31). The page then replaces the
  // form with its locked state
  onLocked?: () => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const onBooked = useOnTrialBooked()
  if (!editing && !onBooked) {
    throw new Error("Booking a trial lesson needs TrialLessonBooking.")
  }
  // Its own hour stays selectable ("Yours") and exempt from the lead time
  const ownStartsAt = editing?.starts_at
  const schema = useMemo(
    () => trialLessonFormSchema(subjects, { ownStartsAt }),
    [subjects, ownStartsAt],
  )
  const form = useForm<TrialLessonFormInput, unknown, TrialLessonValues>({
    resolver: zodResolver(schema),
    defaultValues: prefill(editing, subjects),
  })
  const {
    control,
    setValue,
    getValues,
    formState: { errors },
  } = form
  const subjectId = useWatch({ control, name: "subject" })
  const subject = subjects.find(({ id }) => id === subjectId)

  const { query: availability, slotAvailability } = useTrialAvailability({
    ownStartsAt,
  })

  const editingId = editing?.id
  const labels = editingId === undefined ? LABELS.book : LABELS.edit
  const mutation = useMutation({
    mutationFn: (body: TrialLessonRequest) =>
      editingId === undefined
        ? studentFetch<unknown>("/api/student/trial-lessons", {
            method: "POST",
            body,
          })
        : studentFetch<unknown>(`/api/student/trial-lessons/${editingId}`, {
            method: "PATCH",
            body,
          }),
  })
  // A ref, since two quick clicks land before a re-render. After a booking
  // the page swaps the form for the confirmation; after an edit it stays
  // true through the navigation to the dashboard
  const submitting = useRef(false)
  const pending = mutation.isPending || mutation.isSuccess

  const [slotTaken, setSlotTaken] = useState(false)

  const selectSubject = useCallback(
    (id: number) => {
      const chosen = subjects.find((s) => s.id === id)
      if (!chosen) return
      const shouldValidate = form.formState.isSubmitted
      setValue("subject", id, { shouldValidate })
      const level = getValues("level")
      if (chosen.levels.length === 1) {
        setValue("level", chosen.levels[0].code, { shouldValidate })
      } else if (!chosen.levels.some(({ code }) => code === level)) {
        setValue("level", null, { shouldValidate: false })
      }
    },
    [subjects, form.formState, setValue, getValues],
  )

  // `?subject=<slug>` from a subject page, once, after mount (the page is
  // static). An unknown slug, or a subject already picked, changes nothing.
  // Booking only
  const slug = useLocationSearch().get("subject")
  const preselected = useRef(false)
  useEffect(() => {
    if (editingId !== undefined || preselected.current || !slug) return
    preselected.current = true
    const match = subjects.find((s) => s.slug === slug)
    if (match && getValues("subject") === null) selectSubject(match.id)
  }, [editingId, slug, subjects, getValues, selectSubject])

  // The values of a successful edit, until the page is hidden. With Cache
  // Components, Next keeps a page left behind in React's <Activity> and
  // shows it again with its state, so without this a later visit would find
  // the form still "Saving…" with the old values. Reset when the page is
  // hidden, per node_modules/next/dist/docs/01-app/02-guides/
  // preserving-ui-state.md. An unsaved draft is kept. Booking never sets
  // it: the booking page resets itself (TrialLessonBooking)
  const saved = useRef<TrialLessonValues | null>(null)
  const { reset: resetMutation } = mutation
  const { reset: resetForm } = form
  useLayoutEffect(
    () => () => {
      const values = saved.current
      if (!values || !editing) return
      saved.current = null
      submitting.current = false
      resetMutation()
      setSlotTaken(false)
      const next = savedTrialLesson(editing, values, subjects)
      // The edit page renders from this query, so `editing` (and the own
      // hour) become the saved lesson too
      if (next) queryClient.setQueryData(trialLessonQueryKey(next.id), next)
      resetForm(prefill(next ?? editing, subjects))
    },
    [editing, subjects, queryClient, resetMutation, resetForm],
  )

  // The picker only sends null when a refetch shows the selected hour as
  // taken. Not while saving: the lesson itself comes back as "mine"
  const handleSlotChange = useCallback(
    (startsAt: string | null) => {
      if (submitting.current) return
      setSlotTaken(startsAt === null)
      setValue("starts_at", startsAt, {
        shouldValidate: form.formState.isSubmitted,
      })
    },
    [form.formState, setValue],
  )

  async function save(values: TrialLessonValues) {
    if (submitting.current) return
    submitting.current = true
    setSlotTaken(false)
    form.clearErrors("root.server")

    let body: unknown
    try {
      body = await mutation.mutateAsync({
        subject: values.subject,
        level: values.level,
        starts_at: values.starts_at,
      })
    } catch (error) {
      submitting.current = false
      let rest: NormalizedError | null = normalizeMutationError(error)
      if (editingId !== undefined && onLocked && rest.status === 403) {
        // Refetched now, so the locked state's card shows the lock; the
        // dashboard's schedule refetches on its next mount
        void queryClient.invalidateQueries({
          queryKey: trialLessonQueryKey(editingId),
        })
        void queryClient.invalidateQueries({
          queryKey: scheduleQueryKey,
          refetchType: "none",
        })
        onLocked()
        return
      }
      if (hasErrorMessage(rest, SLOT_TAKEN_MESSAGE)) {
        setSlotTaken(true)
        // Fresh availability marks the hour taken; the picker then clears it
        void queryClient.invalidateQueries({ queryKey: availabilityQueryKey })
        rest = withoutMessage(rest, SLOT_TAKEN_MESSAGE)
      }
      if (rest) applyServerErrors(form, rest, { fields: FIELDS })
      return
    }

    if (editingId !== undefined) {
      // Marked stale without refetching here, as in spec 26: a refetch now
      // would show the saved hour as "mine" and flash the taken notice
      for (const queryKey of [
        scheduleQueryKey,
        availabilityQueryKey,
        trialLessonQueryKey(editingId),
      ]) {
        void queryClient.invalidateQueries({ queryKey, refetchType: "none" })
      }
      saved.current = values
      toast.success(labels.done)
      router.push("/dashboard")
      return
    }

    // The new lesson goes into the cached schedule, so a later visit shows
    // it at once rather than the form until the refetch lands
    const created = trialLessonSchema.safeParse(body)
    if (created.success) {
      queryClient.setQueryData<Schedule>(scheduleQueryKey, (old) =>
        old && { ...old, trial_lesson: created.data },
      )
    }
    // Marked stale without refetching here, as in spec 25: both refetch on
    // their next mount
    void queryClient.invalidateQueries({
      queryKey: scheduleQueryKey,
      refetchType: "none",
    })
    void queryClient.invalidateQueries({
      queryKey: availabilityQueryKey,
      refetchType: "none",
    })
    toast.success(labels.done)

    // From the values sent, so the confirmation never depends on the body.
    // The schema has already checked the subject and level
    const chosen = subjects.find(({ id }) => id === values.subject)
    const level = chosen?.levels.find(({ code }) => code === values.level)
    // The id, for the Edit link (spec 29), only comes from the body
    onBooked?.({
      id: created.success ? created.data.id : undefined,
      subject: { name: chosen?.name ?? "" },
      level: { name: level?.name ?? "" },
      starts_at: values.starts_at,
    })
  }

  // handleSubmit is called per event, not during render: `save` reads the
  // submitting ref
  const onSubmit = (event: FormEvent<HTMLFormElement>) =>
    form.handleSubmit(save)(event)

  const serverMessage = errors.root?.server?.message

  return (
    <form noValidate onSubmit={onSubmit} className="flex max-w-4xl flex-col gap-8">
      <Controller
        control={control}
        name="subject"
        render={({ field, fieldState }) => (
          <ChoiceGroup
            id="subject"
            legend="Subject"
            error={fieldState.error?.message}
          >
            <SubjectChoices
              subjects={subjects}
              fieldRef={field.ref}
              value={field.value}
              onChange={selectSubject}
              invalid={fieldState.invalid}
              disabled={pending}
            />
          </ChoiceGroup>
        )}
      />

      <Controller
        control={control}
        name="level"
        render={({ field, fieldState }) => (
          <ChoiceGroup id="level" legend="Level" error={fieldState.error?.message}>
            <LevelChoices
              subject={subject}
              fieldRef={field.ref}
              value={field.value}
              onChange={field.onChange}
              invalid={fieldState.invalid}
              disabled={pending}
            />
          </ChoiceGroup>
        )}
      />

      <Controller
        control={control}
        name="starts_at"
        render={({ field, fieldState }) => (
          <ChoiceGroup
            id="starts_at"
            legend="Time"
            error={fieldState.error?.message}
          >
            <SlotTakenNotice show={slotTaken} />
            {availabilityFailed(availability) ? (
              <AvailabilityRetry query={availability} />
            ) : (
              <div ref={focusRef(field.ref, PICKER_TAB_STOP)}>
                <TrialSlotPicker
                  value={field.value}
                  onChange={handleSlotChange}
                  slotAvailability={slotAvailability}
                  ownStartsAt={ownStartsAt}
                  disabled={pending}
                  aria-labelledby="starts_at-legend"
                  aria-describedby={
                    fieldState.error ? "starts_at-error" : undefined
                  }
                  aria-invalid={fieldState.invalid || undefined}
                />
              </div>
            )}
          </ChoiceGroup>
        )}
      />

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <p className="max-w-[65ch] text-lg">
          Your trial lesson is 60 minutes, free, and online on Zoom or Google
          Meet.
        </p>

        <FormAlert message={serverMessage} />

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full text-base sm:w-auto sm:self-start sm:px-6"
        >
          {pending ? labels.pending : labels.submit}
        </Button>
      </div>
    </form>
  )
}
