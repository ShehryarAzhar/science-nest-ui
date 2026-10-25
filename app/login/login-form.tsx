"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlertIcon, EyeIcon, EyeOffIcon } from "lucide-react"

import { login } from "@/app/login/actions"
import {
  INVALID_CREDENTIALS_MESSAGE,
  loginSchema,
  type LoginValues,
} from "@/app/login/schema"
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
  const [passwordShown, setPasswordShown] = useState(false)
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
    <form method="post" noValidate onSubmit={onSubmit} className="flex flex-col">
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
          <div className="relative">
            <Input
              id="password"
              type={passwordShown ? "text" : "password"}
              autoComplete="current-password"
              className="pr-11"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 size-11 text-muted-foreground hover:text-foreground"
              aria-label={passwordShown ? "Hide password" : "Show password"}
              onClick={() => setPasswordShown((shown) => !shown)}
            >
              {passwordShown ? (
                <EyeOffIcon aria-hidden className="size-5" />
              ) : (
                <EyeIcon aria-hidden className="size-5" />
              )}
            </Button>
          </div>
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
