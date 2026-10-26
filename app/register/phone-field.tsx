"use client"

import {
  createContext,
  use,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type ComponentProps,
} from "react"
import { Controller, type Control } from "react-hook-form"
import { parsePhoneNumberFromString } from "libphonenumber-js/max"
import PhoneInput, {
  getCountryCallingCode,
  isSupportedCountry,
  type Country,
} from "react-phone-number-input/max"
import flags from "react-phone-number-input/flags"
import { cn } from "cn"

import {
  CountryCombobox,
  type CountrySelectExtraProps,
} from "@/app/register/country-combobox"
import type { RegisterFormValues } from "@/app/register/schema"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

// The only importer of the phone library (with `max` metadata and the
// bundled flags), so no other route's JavaScript carries it

const NUMBER_ID = "phone_number"
const ERROR_ID = "phone_number-error"

const subscribe = () => () => {}

// The region of the first preferred language that has one (`en-PK` →
// Pakistan). A bare `en` isn't expanded to a guessed region: no default is
// better than a confident wrong one. Browser-only, so the server render (and
// the static page) has no default
function guessCountry() {
  for (const tag of navigator.languages ?? []) {
    try {
      const region = new Intl.Locale(tag).region
      if (region && isSupportedCountry(region)) {
        return region
      }
    } catch {
      // Malformed tag: try the next one
    }
  }
  return undefined
}

// With no country selected the library treats every input as international
// and prepends a `+`, so local digits would auto-select a wrong country
// (3001234567 → +30, Greece). Instead, digits typed without a `+` stay in a
// local draft the library never sees, until a country is chosen or the
// student starts with `+`
type Draft = {
  noCountry: boolean
  draft: string
  onDraftChange: (draft: string) => void
}

const DraftContext = createContext<Draft | null>(null)

// Borderless: the surrounding control draws the border and focus ring
function NumberInput({
  className,
  value,
  onChange,
  onKeyDown,
  ...props
}: ComponentProps<"input">) {
  const draft = use(DraftContext)
  const inputClassName = cn(
    "h-full min-w-0 flex-1 rounded-none border-0 bg-transparent tabular-nums focus-visible:ring-0 aria-invalid:ring-0 dark:aria-invalid:ring-0",
    className,
  )

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value
    if (draft?.noCountry && text !== "" && !text.trimStart().startsWith("+")) {
      draft.onDraftChange(text)
      return
    }
    draft?.onDraftChange("")
    onChange?.(event)
  }

  if (draft?.draft) {
    // Plain text while drafting: the library's formatting and key handling
    // only apply to numbers it owns
    return (
      <Input
        {...props}
        className={inputClassName}
        value={draft.draft}
        onChange={handleChange}
      />
    )
  }

  return (
    <Input
      {...props}
      className={inputClassName}
      value={value}
      onChange={handleChange}
      onKeyDown={onKeyDown}
    />
  )
}

export function PhoneField({
  control,
  numberError,
  countryError,
}: {
  control: Control<RegisterFormValues>
  numberError?: string
  countryError?: string
}) {
  const guessedCountry = useSyncExternalStore(
    subscribe,
    guessCountry,
    () => undefined,
  )
  const anchorRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState("")
  const error = countryError ?? numberError
  const invalid = !!error

  return (
    <Field data-invalid={invalid} className="gap-2">
      <FieldLabel htmlFor={NUMBER_ID}>Phone number</FieldLabel>
      <Controller
        control={control}
        name="phone_country"
        render={({ field: countryField }) => (
          <Controller
            control={control}
            name="phone_number"
            render={({ field }) => (
              <DraftContext
                value={{
                  noCountry: !countryField.value,
                  draft,
                  // The draft is the form value too, so validation can ask
                  // for a country
                  onDraftChange: (next) => {
                    setDraft(next)
                    if (next !== "" || draft !== "") {
                      field.onChange(next)
                    }
                  },
                }}
              >
                <PhoneInput
                  ref={field.ref}
                  // The library only takes E.164; a draft isn't
                  value={field.value.startsWith("+") ? field.value : undefined}
                  onChange={(value) => field.onChange(value ?? "")}
                  onBlur={field.onBlur}
                  // Only while the student hasn't picked one; the library
                  // also never overrides a country chosen in the selector
                  defaultCountry={
                    countryField.value ? undefined : guessedCountry
                  }
                  onCountryChange={(country?: Country) => {
                    countryField.onChange(country)
                    // Choosing a country turns the drafted local digits into
                    // that country's number
                    if (country && draft) {
                      const number =
                        parsePhoneNumberFromString(draft, country)?.number ??
                        `+${getCountryCallingCode(country)}${draft.replace(/\D/g, "")}`
                      setDraft("")
                      field.onChange(number)
                    }
                  }}
                  flags={flags}
                  countrySelectComponent={CountryCombobox}
                  countrySelectProps={
                    {
                      triggerRef: countryField.ref,
                      anchorRef,
                      numberInputId: NUMBER_ID,
                      invalid: !!countryError,
                      describedBy: countryError ? ERROR_ID : undefined,
                    } satisfies CountrySelectExtraProps
                  }
                  inputComponent={NumberInput}
                  // The basic input: its plain change handling is what lets
                  // NumberInput swap in the draft safely
                  smartCaret={false}
                  id={NUMBER_ID}
                  autoComplete="tel"
                  aria-invalid={!!numberError}
                  aria-describedby={numberError ? ERROR_ID : undefined}
                  containerComponentProps={{ ref: anchorRef }}
                  className={cn(
                    "flex h-11 w-full items-stretch overflow-hidden rounded-md border border-input bg-card transition-[color,box-shadow]",
                    "has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50",
                    invalid &&
                      "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40",
                  )}
                />
              </DraftContext>
            )}
          />
        )}
      />
      <FieldError id={ERROR_ID} className="whitespace-pre-line">
        {error}
      </FieldError>
    </Field>
  )
}
