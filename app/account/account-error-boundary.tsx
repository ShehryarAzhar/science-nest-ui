"use client"

import { catchError, type ErrorInfo } from "next/error"
import { CloudOffIcon } from "lucide-react"

import { SubjectsPanel } from "@/app/subjects/subjects-panel"
import { routeActionClass } from "@/components/route-state"
import { Button } from "@/components/ui/button"
import { AccountShell } from "./account-shell"

// Catches a failed account read that isn't a 401 or 403 (those render the
// student access guard instead): backend down, timeout, 5xx or an invalid
// response. Inline, so the shell stays up; the error itself is never shown
function AccountError(_props: object, { retry }: ErrorInfo) {
  return (
    <AccountShell>
      <SubjectsPanel
        role="alert"
        icon={<CloudOffIcon aria-hidden className="size-5 shrink-0" />}
        heading="Account details couldn't be loaded"
      >
        <p>Please try again in a moment.</p>
      </SubjectsPanel>
      <div className="mt-4">
        <Button onClick={() => retry()} className={routeActionClass}>
          Try again
        </Button>
      </div>
    </AccountShell>
  )
}

export const AccountErrorBoundary = catchError(AccountError)
