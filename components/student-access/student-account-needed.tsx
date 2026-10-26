import Link from "next/link"
import { ShieldUserIcon } from "lucide-react"

import { LogoutPrimaryButton } from "@/components/layout/logout-button"
import { RouteState, routeActionClass } from "@/components/route-state"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Shown in place of a student page when its data read returns 403: a
// logged-in account with no Student profile (admin or staff). Not an error,
// so no error colours and never the backend's detail. No hooks, so server
// and client pages can both render it
export function StudentAccountNeeded() {
  return (
    <RouteState
      media={
        <ShieldUserIcon
          aria-hidden
          strokeWidth={1.5}
          className="mb-4 size-10 text-primary"
        />
      }
      heading="Student account needed"
      description="This area is for student accounts. You're logged in with an account that has no student profile, such as an admin or staff account. Log out, then log in with a student account."
      actions={
        <>
          <LogoutPrimaryButton className={routeActionClass} />
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline" }), routeActionClass)}
          >
            Home
          </Link>
        </>
      }
    />
  )
}
