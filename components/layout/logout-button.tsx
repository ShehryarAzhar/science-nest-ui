"use client"

import { useFormStatus } from "react-dom"
import { useQueryClient } from "@tanstack/react-query"
import { LogOutIcon } from "lucide-react"

import { logout } from "@/app/login/actions"
import { buttonVariants } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// action stays the server action itself, so logging out works before
// hydration. onSubmit doesn't cancel the submit: it only drops the previous
// student's cached data before React runs the action
function LogoutForm({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  return (
    <form action={logout} onSubmit={() => queryClient.clear()}>
      {children}
    </form>
  )
}

function LogoutLabel() {
  const { pending } = useFormStatus()
  return (
    <>
      <LogOutIcon aria-hidden />
      {pending ? "Logging out…" : "Log out"}
    </>
  )
}

function DesktopSubmit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      // An action, not a destination: muted text instead of the links' primary
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "h-9 px-3 text-base font-normal text-muted-foreground",
      )}
    >
      <LogoutLabel />
    </button>
  )
}

function MenuSubmit() {
  const { pending } = useFormStatus()
  return (
    <DropdownMenuItem
      nativeButton
      render={<button type="submit" disabled={pending} />}
      className="w-full text-muted-foreground"
    >
      <LogoutLabel />
    </DropdownMenuItem>
  )
}

export function LogoutButton() {
  return (
    <LogoutForm>
      <DesktopSubmit />
    </LogoutForm>
  )
}

function PrimarySubmit({ className }: { className?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(buttonVariants(), className)}
    >
      <LogoutLabel />
    </button>
  )
}

// The main action of the "Student account needed" message (spec 15)
export function LogoutPrimaryButton({ className }: { className?: string }) {
  return (
    <LogoutForm>
      <PrimarySubmit className={className} />
    </LogoutForm>
  )
}

// The menu closes on click, so the pending label is rarely seen here
export function LogoutMenuItem() {
  return (
    <LogoutForm>
      <MenuSubmit />
    </LogoutForm>
  )
}
