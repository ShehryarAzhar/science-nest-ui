"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
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
  trialLessonSchema,
  type Schedule,
} from "@/lib/schedule"
import { studentFetch } from "@/lib/student-api"
import type { Subject } from "@/lib/subjects"
import { useLocationSearch } from "@/lib/use-location-search"
import { useOnTrialBooked } from "./trial-lesson-booking"

// Spec 28. Subject, level and a UTC starts_at, posted through the student
// API proxy. Subjects come from the server; availability, local times and
// `?subject=` only exist in the browser

// On-screen order: the first one with an error gets focus
const FIELDS = ["subject", "level", "starts_at"] as const

type TrialLessonRequest = {
  subject: number
  level: string
  starts_at: string
}

export function TrialLessonForm({
  subjects,
}: {
  subjects: readonly Subject[]
}) {
  const queryClient = useQueryClient()
  const onBooked = useOnTrialBooked()
  const schema = useMemo(() => trialLessonFormSchema(subjects), [subjects])
  const form = useForm<TrialLessonFormInput, unknown, TrialLessonValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: null, level: null, starts_at: null },
  })
  const {
    control,
    setValue,
    getValues,
    formState: { errors },
  } = form
  const subjectId = useWatch({ control, name: "subject" })
  const subject = subjects.find(({ id }) => id === subjectId)

  const { query: availability, slotAvailability } = useTrialAvailability()

  const mutation = useMutation({
    mutationFn: (body: TrialLessonRequest) =>
      studentFetch<unknown>("/api/student/trial-lessons", {
        method: "POST",
        body,
      }),
  })
  // A ref, since two quick clicks land before a re-render. On success the
  // page swaps the form for the confirmation, so nothing here outlives it
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
  // static). An unknown slug, or a subject already picked, changes nothing
  const slug = useLocationSearch().get("subject")
  const preselected = useRef(false)
  useEffect(() => {
    if (preselected.current || !slug) return
    preselected.current = true
    const match = subjects.find((s) => s.slug === slug)
    if (match && getValues("subject") === null) selectSubject(match.id)
  }, [slug, subjects, getValues, selectSubject])

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
      if (hasErrorMessage(rest, SLOT_TAKEN_MESSAGE)) {
        setSlotTaken(true)
        // Fresh availability marks the hour taken; the picker then clears it
        void queryClient.invalidateQueries({ queryKey: availabilityQueryKey })
        rest = withoutMessage(rest, SLOT_TAKEN_MESSAGE)
      }
      if (rest) applyServerErrors(form, rest, { fields: FIELDS })
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
    toast.success("Trial lesson booked.")

    // From the values sent, so the confirmation never depends on the body.
    // The schema has already checked the subject and level
    const chosen = subjects.find(({ id }) => id === values.subject)
    const level = chosen?.levels.find(({ code }) => code === values.level)
    onBooked({
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
          {pending ? "Booking…" : "Book free trial"}
        </Button>
      </div>
    </form>
  )
}
