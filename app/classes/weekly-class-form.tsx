"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch, type RefCallBack } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CircleAlertIcon, CloudOffIcon, TriangleAlertIcon } from "lucide-react"

import {
  SLOT_TAKEN_MESSAGE,
  weeklyClassFormSchema,
  type WeeklyClassFormInput,
  type WeeklyClassValues,
} from "@/app/classes/schema"
import { SubjectsPanel } from "@/app/subjects/subjects-panel"
import { routeActionClass } from "@/components/route-state"
import { WeeklySlotPicker } from "@/components/slot-picker/weekly-slot-picker"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { RadioCard, RadioGroup } from "@/components/ui/radio-group"
import { toast } from "@/components/ui/sonner"
import { availabilityQueryKey, useWeeklyAvailability } from "@/lib/availability"
import {
  GENERIC_ERROR_MESSAGE,
  hasErrorMessage,
  type NormalizedError,
} from "@/lib/drf-errors"
import { applyServerErrors } from "@/lib/form-errors"
import { formatUsd } from "@/lib/format-usd"
import {
  scheduleQueryKey,
  weeklyClassQueryKey,
  type WeeklyClassDetail,
} from "@/lib/schedule"
import { StudentApiError, studentFetch } from "@/lib/student-api"
import type { Subject } from "@/lib/subjects"
import { isNoStudentProfileError } from "@/lib/student-access"
import type { ClassDuration, WeeklySlotUtc } from "@/lib/time-zone"
import { useLocationSearch } from "@/lib/use-location-search"

// Specs 25 and 26. Subject, level, duration and a weekly UTC slot, posted
// (booking) or patched (editing) through the student API proxy. Subjects
// come from the server; availability, local times and `?subject=` only exist
// in the browser

// On-screen order: the first one with an error gets focus
const FIELDS = ["subject", "level", "duration", "slot"] as const
const DURATIONS: readonly ClassDuration[] = [40, 60]

const LABELS = {
  book: { submit: "Book weekly class", pending: "Booking…", done: "Weekly class booked." },
  edit: { submit: "Save changes", pending: "Saving…", done: "Weekly class updated." },
}

type WeeklyClassRequest = {
  subject: number
  level: string
  day: string
  time: string
  duration: ClassDuration
}

// react-hook-form focuses a field through `ref.focus()`. A radio group or
// the picker isn't one element, so focus its tab stop: the checked radio,
// else the first enabled one (the picker keeps exactly one at tabindex 0)
function focusRef(ref: RefCallBack, selector: string) {
  return (element: HTMLElement | null) => {
    ref(
      element && {
        focus: () => element.querySelector<HTMLElement>(selector)?.focus(),
      },
    )
  }
}
const GROUP_TAB_STOP =
  '[role="radio"][aria-checked="true"], [role="radio"]:not([data-disabled])'
const PICKER_TAB_STOP = '[role="radio"][tabindex="0"]'

// The "already booked" message has its own notice; anything else in the
// same response still goes to the form
function withoutMessage(
  error: NormalizedError,
  message: string,
): NormalizedError | null {
  const formErrors = error.formErrors.filter((m) => m !== message)
  const fieldErrors = Object.fromEntries(
    Object.entries(error.fieldErrors)
      .map(([field, messages]) => [field, messages.filter((m) => m !== message)])
      .filter(([, messages]) => messages.length > 0),
  )
  return formErrors.length > 0 || Object.keys(fieldErrors).length > 0
    ? { ...error, formErrors, fieldErrors }
    : null
}

// The loaded class as the form's starting values, checked against the
// current subject list: a subject no longer listed, or a level the subject
// no longer offers, starts unchosen (a single level is picked, as when
// choosing the subject)
function prefill(
  editing: WeeklyClassDetail | undefined,
  subjects: readonly Subject[],
): WeeklyClassFormInput {
  if (!editing) return { subject: null, level: null, duration: null, slot: null }
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
    duration: editing.duration,
    slot: { day: editing.day, time: editing.time },
  }
}

// The class as just saved, from the values sent, so a page shown again
// starts from it rather than from the class as first loaded
function savedClass(
  editing: WeeklyClassDetail,
  values: WeeklyClassValues,
  subjects: readonly Subject[],
): WeeklyClassDetail | undefined {
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
    day: values.slot.day,
    time: values.slot.time,
    duration: values.duration,
  }
}

function normalized(error: unknown): NormalizedError {
  return error instanceof StudentApiError
    ? error.normalized
    : {
        kind: "unknown",
        status: null,
        fieldErrors: {},
        formErrors: [GENERIC_ERROR_MESSAGE],
      }
}

export function WeeklyClassForm({
  subjects,
  editing,
}: {
  subjects: readonly Subject[]
  // The class being edited (spec 26); booking when absent
  editing?: WeeklyClassDetail
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const schema = useMemo(() => weeklyClassFormSchema(subjects), [subjects])
  const form = useForm<WeeklyClassFormInput, unknown, WeeklyClassValues>({
    resolver: zodResolver(schema),
    defaultValues: prefill(editing, subjects),
  })
  const {
    control,
    setValue,
    getValues,
    formState: { errors },
  } = form
  const [subjectId, duration] = useWatch({
    control,
    name: ["subject", "duration"],
  })
  const subject = subjects.find(({ id }) => id === subjectId)

  // The class's slot as loaded stays selectable ("Yours"), even after
  // another one is picked
  const { query: availability, slotAvailability } = useWeeklyAvailability({
    ownSlot: editing && { day: editing.day, time: editing.time },
  })

  const editingId = editing?.id
  const labels = editingId === undefined ? LABELS.book : LABELS.edit
  const mutation = useMutation({
    mutationFn: (body: WeeklyClassRequest) =>
      editingId === undefined
        ? studentFetch<unknown>("/api/student/classes", { method: "POST", body })
        : studentFetch<unknown>(`/api/student/classes/${editingId}`, {
            method: "PATCH",
            body,
          }),
  })
  // Stays true through the navigation to the dashboard, so the form can't
  // post twice. A ref, since two quick clicks land before a re-render
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

  // The values of a successful save, until the page is hidden. With Cache
  // Components, Next keeps a page left behind in React's <Activity> and
  // shows it again with its state, so without this a later visit would find
  // the form still pending ("Saving…") with the old values. Reset when the
  // page is hidden, per node_modules/next/dist/docs/01-app/02-guides/
  // preserving-ui-state.md. An unsaved draft is kept
  const saved = useRef<WeeklyClassValues | null>(null)
  const { reset: resetMutation } = mutation
  const { reset: resetForm } = form
  useLayoutEffect(
    () => () => {
      const values = saved.current
      if (!values) return
      saved.current = null
      submitting.current = false
      preselected.current = false
      resetMutation()
      setSlotTaken(false)
      const next = editing && savedClass(editing, values, subjects)
      // The edit page renders from this query, so `editing` (and the own
      // slot) become the saved class too
      if (next) queryClient.setQueryData(weeklyClassQueryKey(next.id), next)
      resetForm(prefill(next ?? editing, subjects))
    },
    [editing, subjects, queryClient, resetMutation, resetForm],
  )

  // The picker only sends null when a refetch shows the selected slot as
  // taken. Not while saving: the class itself comes back as "mine"
  const handleSlotChange = useCallback(
    (slot: WeeklySlotUtc | null) => {
      if (submitting.current) return
      setSlotTaken(slot === null)
      setValue("slot", slot, { shouldValidate: form.formState.isSubmitted })
    },
    [form.formState, setValue],
  )

  async function save(values: WeeklyClassValues) {
    if (submitting.current) return
    submitting.current = true
    setSlotTaken(false)
    form.clearErrors("root.server")

    try {
      await mutation.mutateAsync({
        subject: values.subject,
        level: values.level,
        day: values.slot.day,
        time: values.slot.time,
        duration: values.duration,
      })
    } catch (error) {
      submitting.current = false
      let rest: NormalizedError | null = normalized(error)
      if (hasErrorMessage(rest, SLOT_TAKEN_MESSAGE)) {
        setSlotTaken(true)
        // Fresh availability marks the slot taken; the picker then clears it
        void queryClient.invalidateQueries({ queryKey: availabilityQueryKey })
        rest = withoutMessage(rest, SLOT_TAKEN_MESSAGE)
      }
      if (rest) {
        applyServerErrors(form, rest, {
          fields: FIELDS,
          rename: { day: "slot", time: "slot" },
        })
      }
      return
    }

    // Marked stale without refetching here: a refetch now would show the
    // saved class as "mine" in the picker and flash the taken notice. They
    // refetch on their next mount
    void queryClient.invalidateQueries({
      queryKey: scheduleQueryKey,
      refetchType: "none",
    })
    void queryClient.invalidateQueries({
      queryKey: availabilityQueryKey,
      refetchType: "none",
    })
    if (editingId !== undefined) {
      void queryClient.invalidateQueries({
        queryKey: weeklyClassQueryKey(editingId),
        refetchType: "none",
      })
    }
    saved.current = values
    toast.success(labels.done)
    router.push("/dashboard")
  }

  // handleSubmit is called per event, not during render: `save` reads the
  // submitting ref
  const onSubmit = (event: FormEvent<HTMLFormElement>) =>
    form.handleSubmit(save)(event)

  const serverMessage = errors.root?.server?.message
  // A 403 replaces the page (BookingShell); other failures with nothing
  // loaded yet show a retry where the picker goes
  const availabilityFailed =
    availability.isError &&
    !availability.data &&
    !isNoStudentProfileError(availability.error)

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
            <RadioGroup<number | null>
              ref={focusRef(field.ref, GROUP_TAB_STOP)}
              aria-labelledby="subject-legend"
              aria-describedby={fieldState.error ? "subject-error" : undefined}
              aria-invalid={fieldState.invalid || undefined}
              value={field.value}
              onValueChange={(id) => id !== null && selectSubject(id)}
              disabled={pending}
              className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            >
              {subjects.map((s) => (
                <RadioCard key={s.id} value={s.id}>
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-sm text-muted-foreground group-data-checked/radio:text-secondary-foreground">
                    {s.levels.map(({ name }) => name).join(", ")}
                  </span>
                </RadioCard>
              ))}
            </RadioGroup>
          </ChoiceGroup>
        )}
      />

      <Controller
        control={control}
        name="level"
        render={({ field, fieldState }) => (
          <ChoiceGroup id="level" legend="Level" error={fieldState.error?.message}>
            {subject ? (
              <RadioGroup<string | null>
                ref={focusRef(field.ref, GROUP_TAB_STOP)}
                aria-labelledby="level-legend"
                aria-describedby={fieldState.error ? "level-error" : undefined}
                aria-invalid={fieldState.invalid || undefined}
                value={field.value}
                onValueChange={(code) => field.onChange(code)}
                disabled={pending}
                className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              >
                {subject.levels.map(({ code, name }) => (
                  <RadioCard key={code} value={code}>
                    <span className="font-semibold">{name}</span>
                  </RadioCard>
                ))}
              </RadioGroup>
            ) : (
              <p className="text-muted-foreground">
                Choose a subject to see its levels.
              </p>
            )}
          </ChoiceGroup>
        )}
      />

      <Controller
        control={control}
        name="duration"
        render={({ field, fieldState }) => (
          <ChoiceGroup
            id="duration"
            legend="Duration"
            error={fieldState.error?.message}
          >
            <RadioGroup<ClassDuration | null>
              ref={focusRef(field.ref, GROUP_TAB_STOP)}
              aria-labelledby="duration-legend"
              aria-describedby={fieldState.error ? "duration-error" : undefined}
              aria-invalid={fieldState.invalid || undefined}
              value={field.value}
              onValueChange={(minutes) => field.onChange(minutes)}
              disabled={pending}
              className="grid-cols-1 sm:grid-cols-2"
            >
              {DURATIONS.map((minutes) => (
                <RadioCard key={minutes} value={minutes}>
                  <span className="font-semibold">{minutes} minutes</span>
                  {subject && (
                    <span className="tabular-nums">
                      <span className="font-heading text-xl font-semibold">
                        {formatUsd(
                          minutes === 40
                            ? subject.price_40_min
                            : subject.price_60_min,
                        )}
                      </span>{" "}
                      <span className="text-muted-foreground group-data-checked/radio:text-secondary-foreground">
                        per week
                      </span>
                    </span>
                  )}
                </RadioCard>
              ))}
            </RadioGroup>
          </ChoiceGroup>
        )}
      />

      <Controller
        control={control}
        name="slot"
        render={({ field, fieldState }) => (
          <ChoiceGroup id="slot" legend="Time" error={fieldState.error?.message}>
            {/* Always mounted so screen readers announce the notice */}
            <div role="alert">
              {slotTaken && (
                <p className="mb-4 flex items-start gap-2 rounded-md bg-warning p-4 text-warning-foreground">
                  <TriangleAlertIcon aria-hidden className="mt-1 size-4 shrink-0" />
                  That time was just booked by someone else. Choose another
                  time.
                </p>
              )}
            </div>
            {availabilityFailed ? (
              <div>
                <SubjectsPanel
                  role="alert"
                  icon={<CloudOffIcon aria-hidden className="size-5 shrink-0" />}
                  heading="Available times couldn't be loaded"
                >
                  <p>Please try again in a moment.</p>
                </SubjectsPanel>
                <Button
                  type="button"
                  onClick={() => void availability.refetch()}
                  disabled={availability.isFetching}
                  className={`mt-4 ${routeActionClass}`}
                >
                  Try again
                </Button>
              </div>
            ) : (
              <div ref={focusRef(field.ref, PICKER_TAB_STOP)}>
                <WeeklySlotPicker
                  value={field.value}
                  onChange={handleSlotChange}
                  slotAvailability={slotAvailability}
                  disabled={pending}
                  aria-labelledby="slot-legend"
                  aria-describedby={fieldState.error ? "slot-error" : undefined}
                  aria-invalid={fieldState.invalid || undefined}
                />
              </div>
            )}
          </ChoiceGroup>
        )}
      />

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <p aria-live="polite" className="text-lg">
          {subject && duration !== null && (
            <>
              Weekly price:{" "}
              <span className="font-semibold tabular-nums">
                {formatUsd(
                  duration === 40 ? subject.price_40_min : subject.price_60_min,
                )}
              </span>{" "}
              per week
            </>
          )}
        </p>

        {/* Always mounted so screen readers announce the message when it appears */}
        <div role="alert">
          {serverMessage && (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span className="whitespace-pre-line">{serverMessage}</span>
            </p>
          )}
        </div>

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

// A fieldset whose legend is the group's name; the error sits below
function ChoiceGroup({
  id,
  legend,
  error,
  children,
}: {
  id: string
  legend: string
  error?: string
  children: ReactNode
}) {
  return (
    <fieldset data-invalid={!!error || undefined} className="min-w-0">
      <legend id={`${id}-legend`} className="mb-3 font-heading text-xl font-semibold">
        {legend}
      </legend>
      {children}
      <FieldError id={`${id}-error`} className="mt-2 whitespace-pre-line">
        {error}
      </FieldError>
    </fieldset>
  )
}
