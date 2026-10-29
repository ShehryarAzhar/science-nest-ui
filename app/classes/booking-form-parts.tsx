"use client"

import type { ReactNode } from "react"
import type { RefCallBack } from "react-hook-form"
import type { UseQueryResult } from "@tanstack/react-query"
import { CircleAlertIcon, CloudOffIcon, TriangleAlertIcon } from "lucide-react"

import { SubjectsPanel } from "@/app/subjects/subjects-panel"
import { routeActionClass } from "@/components/route-state"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { RadioCard, RadioGroup } from "@/components/ui/radio-group"
import { GENERIC_ERROR_MESSAGE, type NormalizedError } from "@/lib/drf-errors"
import { StudentApiError } from "@/lib/student-api"
import { isNoStudentProfileError } from "@/lib/student-access"
import type { Subject } from "@/lib/subjects"

// Shared by the weekly class form (specs 25 and 26) and the trial lesson
// form (spec 28): the choice groups, the notices and the error helpers

// react-hook-form focuses a field through `ref.focus()`. A radio group or
// the picker isn't one element, so focus its tab stop: the checked radio,
// else the first enabled one (the pickers keep exactly one at tabindex 0)
export function focusRef(ref: RefCallBack, selector: string) {
  return (element: HTMLElement | null) => {
    ref(
      element && {
        focus: () => element.querySelector<HTMLElement>(selector)?.focus(),
      },
    )
  }
}
export const GROUP_TAB_STOP =
  '[role="radio"][aria-checked="true"], [role="radio"]:not([data-disabled])'
export const PICKER_TAB_STOP = '[role="radio"][tabindex="0"]'

// The "already booked" message has its own notice; anything else in the
// same response still goes to the form
export function withoutMessage(
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

export function normalizeMutationError(error: unknown): NormalizedError {
  return error instanceof StudentApiError
    ? error.normalized
    : {
        kind: "unknown",
        status: null,
        fieldErrors: {},
        formErrors: [GENERIC_ERROR_MESSAGE],
      }
}

// A 403 replaces the page (BookingShell); other failures with nothing
// loaded yet show a retry where the picker goes
export function availabilityFailed(query: UseQueryResult<unknown>): boolean {
  return query.isError && !query.data && !isNoStudentProfileError(query.error)
}

// A fieldset whose legend is the group's name; the error sits below
export function ChoiceGroup({
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

type ChoiceProps<Value> = {
  fieldRef: RefCallBack
  value: Value | null
  onChange: (value: Value) => void
  invalid: boolean
  disabled: boolean
}

export function SubjectChoices({
  subjects,
  fieldRef,
  value,
  onChange,
  invalid,
  disabled,
}: ChoiceProps<number> & { subjects: readonly Subject[] }) {
  return (
    <RadioGroup<number | null>
      ref={focusRef(fieldRef, GROUP_TAB_STOP)}
      aria-labelledby="subject-legend"
      aria-describedby={invalid ? "subject-error" : undefined}
      aria-invalid={invalid || undefined}
      value={value}
      onValueChange={(id) => id !== null && onChange(id)}
      disabled={disabled}
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
  )
}

// The chosen subject's levels only; a hint until a subject is chosen
export function LevelChoices({
  subject,
  fieldRef,
  value,
  onChange,
  invalid,
  disabled,
}: ChoiceProps<string> & { subject: Subject | undefined }) {
  if (!subject) {
    return (
      <p className="text-muted-foreground">Choose a subject to see its levels.</p>
    )
  }
  return (
    <RadioGroup<string | null>
      ref={focusRef(fieldRef, GROUP_TAB_STOP)}
      aria-labelledby="level-legend"
      aria-describedby={invalid ? "level-error" : undefined}
      aria-invalid={invalid || undefined}
      value={value}
      onValueChange={(code) => code !== null && onChange(code)}
      disabled={disabled}
      className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    >
      {subject.levels.map(({ code, name }) => (
        <RadioCard key={code} value={code}>
          <span className="font-semibold">{name}</span>
        </RadioCard>
      ))}
    </RadioGroup>
  )
}

// Always mounted so screen readers announce the notice
export function SlotTakenNotice({ show }: { show: boolean }) {
  return (
    <div role="alert">
      {show && (
        <p className="mb-4 flex items-start gap-2 rounded-md bg-warning p-4 text-warning-foreground">
          <TriangleAlertIcon aria-hidden className="mt-1 size-4 shrink-0" />
          That time was just booked by someone else. Choose another time.
        </p>
      )}
    </div>
  )
}

export function AvailabilityRetry({
  query,
}: {
  query: UseQueryResult<unknown>
}) {
  return (
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
        onClick={() => void query.refetch()}
        disabled={query.isFetching}
        className={`mt-4 ${routeActionClass}`}
      >
        Try again
      </Button>
    </div>
  )
}

// Always mounted so screen readers announce the message when it appears
export function FormAlert({ message }: { message: string | undefined }) {
  return (
    <div role="alert">
      {message && (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span className="whitespace-pre-line">{message}</span>
        </p>
      )}
    </div>
  )
}
