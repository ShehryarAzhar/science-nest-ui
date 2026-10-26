"use client"

import { useState, type ComponentProps } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// A password input with a show/hide toggle inside its right edge, shared by
// the login and register forms. `toggleLabel` names the field in the
// toggle's accessible name ("Show password", "Hide confirm password")
export function PasswordInput({
  toggleLabel = "password",
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { toggleLabel?: string }) {
  const [shown, setShown] = useState(false)

  return (
    <div className="relative">
      <Input
        type={shown ? "text" : "password"}
        className={cn("pr-11", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-0 right-0 size-11 text-muted-foreground hover:text-foreground"
        aria-label={shown ? `Hide ${toggleLabel}` : `Show ${toggleLabel}`}
        onClick={() => setShown((value) => !value)}
      >
        {shown ? (
          <EyeOffIcon aria-hidden className="size-5" />
        ) : (
          <EyeIcon aria-hidden className="size-5" />
        )}
      </Button>
    </div>
  )
}
