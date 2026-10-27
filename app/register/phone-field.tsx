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
import { getTimezone } from "countries-and-timezones"
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getBrowserTimeZone } from "@/lib/time-zone"

// The only importer of the phone library (with `max` metadata and the
// bundled flags), so no other route's JavaScript carries it

const NUMBER_ID = "phone_number"
const ERROR_ID = "phone_number-error"
const HINT_ID = "phone_number-hint"

const subscribe = () => () => {}

// Regions of the preferred languages, in order (`en-GB` → GB). A bare `en`
// isn't expanded to a guessed region
function languageRegions(): Country[] {
  const regions: Country[] = []
  for (const tag of navigator.languages ?? []) {
    try {
      const region = new Intl.Locale(tag).region
      if (region && isSupportedCountry(region)) {
        regions.push(region as Country)
      }
    } catch {
      // Malformed tag: try the next one
    }
  }
  return regions
}

// The country of the browser's time zone (`Asia/Karachi` → Pakistan), which
// follows where the student is far more often than the language setting
// does. A zone shared by several countries (`Europe/London`: GB, GG, IM, JE)
// takes the one the language names, else its main country (listed first).
// Zones with no country (`UTC`) fall back to the first language region, and
// otherwise there's no default: better than a confident wrong one. No
// network lookup. Browser-only, so the server render (and the static page)
// has no default
function guessCountry() {
  const regions = languageRegions()
  let zoneCountries: Country[] = []
  try {
    const countries: string[] = getTimezone(getBrowserTimeZone())?.countries ?? []
    zoneCountries = countries.filter((country): country is Country =>
      isSupportedCountry(country),
    )
  } catch {
    // No usable time zone: use the language
  }
  if (zoneCountries.length > 0) {
    return (
      zoneCountries.find((country) => regions.includes(country)) ??
      zoneCountries[0]
    )
  }
  return regions[0]
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
                  // Always the same value after mount: the library applies a
                  // default only while no country is picked and the field is
                  // empty. Tying it to the selected country made it flip
                  // back to undefined, which the library treats as a new
                  // default and resets the country, looping forever
                  defaultCountry={guessedCountry}
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
                  // The hint first, then the error when there is one
                  aria-describedby={
                    numberError ? `${HINT_ID} ${ERROR_ID}` : HINT_ID
                  }
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
      {/* Class links arrive on WhatsApp (see CLAUDE.md › About the app) */}
      <FieldDescription id={HINT_ID}>
        We&apos;ll send your class links to this number on WhatsApp.
      </FieldDescription>
      <FieldError id={ERROR_ID} className="whitespace-pre-line">
        {error}
      </FieldError>
    </Field>
  )
}
