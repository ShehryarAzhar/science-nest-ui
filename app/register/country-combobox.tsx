"use client"

import { useMemo, useRef, type FocusEventHandler, type Ref, type RefObject } from "react"
import type { Country } from "react-phone-number-input"
import { getCountryCallingCode } from "react-phone-number-input/max"
import flags from "react-phone-number-input/flags"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "cn"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox"

// Props the phone library passes to its `countrySelectComponent`, plus ours
// (through `countrySelectProps`)
export type CountrySelectExtraProps = {
  triggerRef?: Ref<HTMLButtonElement>
  anchorRef?: RefObject<HTMLDivElement | null>
  numberInputId: string
  invalid?: boolean
  describedBy?: string
}

type CountryComboboxProps = CountrySelectExtraProps & {
  value?: Country
  onChange: (value?: Country) => void
  options: { value?: Country; label: string; divider?: boolean }[]
  onFocus?: FocusEventHandler<HTMLButtonElement>
  onBlur?: FocusEventHandler<HTMLButtonElement>
  disabled?: boolean
  readOnly?: boolean
}

type Option = { code: Country; name: string; callingCode: string }

// Decorative: the trigger's and the item's text already name the country.
// A hairline ring keeps white flags visible on the surface
function Flag({ code }: { code: Country }) {
  const Svg = flags[code]
  return (
    <span
      aria-hidden
      className="inline-flex h-4 w-6 shrink-0 overflow-hidden ring-1 ring-border [&>svg]:size-full"
    >
      {Svg ? <Svg title="" /> : null}
    </span>
  )
}

// Name (anywhere), ISO code (prefix) and calling code with or without `+`
// (prefix): "pak", "PK", "92" and "+92" all find Pakistan
function matches(option: Option, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q === "") {
    return true
  }
  const digits = q.replace(/^\+/, "")
  return (
    option.name.toLowerCase().includes(q) ||
    option.code.toLowerCase().startsWith(q) ||
    (/^\d+$/.test(digits) && option.callingCode.startsWith(digits))
  )
}

export function CountryCombobox({
  value,
  onChange,
  options,
  onFocus,
  onBlur,
  disabled,
  readOnly,
  triggerRef,
  anchorRef,
  numberInputId,
  invalid,
  describedBy,
}: CountryComboboxProps) {
  // Every country, without the library's "International" entry
  const items = useMemo(
    () =>
      options.flatMap((option): Option[] =>
        option.value && !option.divider
          ? [
              {
                code: option.value,
                name: option.label,
                callingCode: getCountryCallingCode(option.value),
              },
            ]
          : [],
      ),
    [options],
  )
  const byCode = useMemo(
    () => new Map(items.map((item) => [item.code, item])),
    [items],
  )
  const selected = value ? byCode.get(value) : undefined
  // After a choice focus goes to the number input; Escape returns it to the
  // trigger (Base UI's default)
  const choseCountry = useRef(false)

  return (
    <Combobox<Country>
      items={items.map((item) => item.code)}
      value={value ?? null}
      onValueChange={(code) => {
        if (code) {
          choseCountry.current = true
          onChange(code)
        }
      }}
      itemToStringLabel={(code) => byCode.get(code)?.name ?? code}
      filter={(code, query) => {
        const option = byCode.get(code)
        return option ? matches(option, query) : false
      }}
      disabled={disabled}
      readOnly={readOnly}
    >
      <ComboboxTrigger
        ref={triggerRef}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-label={
          selected
            ? `Country: ${selected.name} +${selected.callingCode}`
            : "Choose country"
        }
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          "flex h-full shrink-0 items-center gap-2 border-r border-input pr-2 pl-3 text-base tabular-nums outline-none",
          "focus-visible:bg-accent focus-visible:text-accent-foreground hover:bg-accent/60",
          "aria-invalid:text-destructive",
        )}
      >
        {selected ? (
          <>
            <Flag code={selected.code} />
            <span>+{selected.callingCode}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Country</span>
        )}
        <ChevronDownIcon aria-hidden className="size-4 text-muted-foreground" />
      </ComboboxTrigger>

      <ComboboxContent
        anchor={anchorRef}
        className="max-h-[min(24rem,var(--available-height))]"
        finalFocus={() => {
          if (choseCountry.current) {
            choseCountry.current = false
            return document.getElementById(numberInputId)
          }
          return true
        }}
      >
        <ComboboxInput placeholder="Search countries" aria-label="Search countries" />
        <ComboboxEmpty>No country found</ComboboxEmpty>
        <ComboboxList>
          {(code: Country) => {
            const option = byCode.get(code)
            if (!option) {
              return null
            }
            return (
              <ComboboxItem key={code} value={code}>
                <Flag code={code} />
                <span className="min-w-0 flex-1 truncate">{option.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  +{option.callingCode}
                </span>
              </ComboboxItem>
            )
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
