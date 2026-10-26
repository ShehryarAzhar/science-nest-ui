"use client"

import { useTransition, type ComponentProps } from "react"
import { useForm, type UseFormRegisterReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlertIcon } from "lucide-react"

import { register as registerAccount } from "@/app/register/actions"
import { PhoneField } from "@/app/register/phone-field"
import {
  registerFormSchema,
  type RegisterFormValues,
} from "@/app/register/schema"
import { PasswordInput } from "@/components/password-input"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { applyServerErrors } from "@/lib/form-errors"

// On-screen order: the first one with a server error gets focus
const FIELDS = [
  "first_name",
  "last_name",
  "username",
  "email",
  "phone_country",
  "phone_number",
  "password",
  "confirm_password",
] as const

export function RegisterForm() {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      username: "",
      email: "",
      phone_number: "",
      phone_country: undefined,
      password: "",
      confirm_password: "",
    },
  })
  const {
    register,
    control,
    formState: { errors, isSubmitting },
  } = form
  const [isPending, startTransition] = useTransition()
  // Stays true through the redirect, so the button can't register twice
  const pending = isPending || isSubmitting

  const onSubmit = form.handleSubmit((values) => {
    if (pending) {
      return
    }
    // Read at submit time, so the page never reads search params while
    // rendering and stays static. register() validates it on the server
    const next = new URLSearchParams(window.location.search).get("next")
    const { first_name, last_name, username, email, phone_number, password } =
      values

    startTransition(async () => {
      const error = await registerAccount({
        values: { first_name, last_name, username, email, phone_number, password },
        next,
      })
      if (!error) {
        return
      }
      startTransition(() => {
        applyServerErrors(form, error, { fields: FIELDS })
      })
    })
  })

  const serverMessage = errors.root?.server?.message

  return (
    // method="post": without JS a native submit never puts the password in
    // the URL
    <form method="post" noValidate onSubmit={onSubmit} className="flex flex-col">
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="first_name"
            label="First name"
            autoComplete="given-name"
            error={errors.first_name?.message}
            registration={register("first_name")}
          />
          <TextField
            id="last_name"
            label="Last name"
            autoComplete="family-name"
            error={errors.last_name?.message}
            registration={register("last_name")}
          />
        </div>
        <TextField
          id="username"
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.username?.message}
          registration={register("username")}
        />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.email?.message}
          registration={register("email")}
        />
        <PhoneField
          control={control}
          numberError={errors.phone_number?.message}
          countryError={errors.phone_country?.message}
        />
        <Field data-invalid={!!errors.password} className="gap-2">
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            // Recheck the match once the confirm field has been validated
            {...register("password", { deps: ["confirm_password"] })}
          />
          <FieldError id="password-error" className="whitespace-pre-line">
            {errors.password?.message}
          </FieldError>
        </Field>
        <Field data-invalid={!!errors.confirm_password} className="gap-2">
          <FieldLabel htmlFor="confirm_password">Confirm password</FieldLabel>
          <PasswordInput
            id="confirm_password"
            toggleLabel="confirm password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm_password}
            aria-describedby={
              errors.confirm_password ? "confirm_password-error" : undefined
            }
            {...register("confirm_password")}
          />
          <FieldError
            id="confirm_password-error"
            className="whitespace-pre-line"
          >
            {errors.confirm_password?.message}
          </FieldError>
        </Field>
      </div>

      {/* Always mounted so screen readers announce the message when it appears */}
      <div role="alert">
        {serverMessage && (
          <p className="mt-6 flex items-start gap-2 text-sm text-destructive">
            <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span className="whitespace-pre-line">{serverMessage}</span>
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="mt-6 h-11 w-full text-base"
      >
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  )
}

function TextField({
  id,
  label,
  error,
  registration,
  ...inputProps
}: {
  id: string
  label: string
  error?: string
  registration: UseFormRegisterReturn
} & Omit<ComponentProps<"input">, "id">) {
  const errorId = `${id}-error`
  return (
    <Field data-invalid={!!error} className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
        {...registration}
      />
      <FieldError id={errorId} className="whitespace-pre-line">
        {error}
      </FieldError>
    </Field>
  )
}
