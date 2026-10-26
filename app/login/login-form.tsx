"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"

import { login } from "@/app/login/actions"
import {
  INVALID_CREDENTIALS_MESSAGE,
  loginSchema,
  type LoginValues,
} from "@/app/login/schema"
import { useLocationSearch } from "@/app/login/use-location-search"
import { PasswordInput } from "@/components/password-input"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { hasErrorMessage } from "@/lib/drf-errors"
import { applyServerErrors } from "@/lib/form-errors"

const FIELDS = ["username", "password"] as const

export function LoginForm() {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })
  const {
    register,
    formState: { errors, isSubmitting },
  } = form
  const [isPending, startTransition] = useTransition()
  // Arriving from a successful registration (register() redirects here with
  // `registered=1` and the new username): a notice until the next submit
  const search = useLocationSearch()
  const registered = search.get("registered") === "1"
  const registeredUsername = registered ? search.get("username") : null
  const [noticeDismissed, setNoticeDismissed] = useState(false)
  const prefilled = useRef(false)

  useEffect(() => {
    if (!registeredUsername || prefilled.current) {
      return
    }
    prefilled.current = true
    form.setValue("username", registeredUsername)
    form.setFocus("password")
  }, [form, registeredUsername])
  // Stays true through the redirect, so the button can't send a second login
  const pending = isPending || isSubmitting

  const onSubmit = form.handleSubmit((values) => {
    if (pending) {
      return
    }
    // Read at submit time, so the page never reads search params while
    // rendering and stays static. login() validates it on the server
    const next = new URLSearchParams(window.location.search).get("next")

    startTransition(async () => {
      const error = await login({ ...values, next })
      if (!error) {
        return
      }
      startTransition(() => {
        applyServerErrors(form, error, { fields: FIELDS })
        if (hasErrorMessage(error, INVALID_CREDENTIALS_MESSAGE)) {
          form.resetField("password")
          form.setFocus("password")
        }
      })
    })
  })

  const serverMessage = errors.root?.server?.message

  return (
    // method="post": without JS a native submit never puts the password in
    // the URL
    <form
      method="post"
      noValidate
      onSubmit={(event) => {
        setNoticeDismissed(true)
        void onSubmit(event)
      }}
      className="flex flex-col"
    >
      {/* Always mounted so screen readers announce the notice when it appears */}
      <div role="status">
        {registered && !noticeDismissed && (
          <p className="mb-6 flex items-start gap-2 rounded-md bg-success px-3 py-2.5 text-sm text-success-foreground">
            <CircleCheckIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>Account created. Log in to continue.</span>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <Field data-invalid={!!errors.username} className="gap-2">
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!errors.username}
            aria-describedby={errors.username ? "username-error" : undefined}
            {...register("username")}
          />
          <FieldError id="username-error" className="whitespace-pre-line">
            {errors.username?.message}
          </FieldError>
        </Field>

        <Field data-invalid={!!errors.password} className="gap-2">
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          <FieldError id="password-error" className="whitespace-pre-line">
            {errors.password?.message}
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
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  )
}
