import { Suspense } from "react"
import Link from "next/link"
import { cookies } from "next/headers"

import { Logo } from "@/components/brand/logo"
import { SiteNav } from "@/components/layout/site-nav"
import { ThemeToggle } from "@/components/layout/theme-toggle"

// Same "logged in" rule as proxy.ts: an access cookie is present. The proxy
// has already refreshed it, or removed both cookies, before this renders
async function HeaderNav() {
  const loggedIn = (await cookies()).has("access")
  return <SiteNav loggedIn={loggedIn} />
}

export function SiteHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 md:px-6">
        {/* p-2 keeps the 0.25 × mark height clear space (7px at 28px) */}
        <Link href="/" className="-ml-2 rounded-md p-2">
          <Logo variant="horizontal" height={28} />
        </Link>
        <div className="flex flex-1 items-center justify-end gap-1 md:gap-2">
          {/* Cookies are request data, so only the nav is dynamic. The
              fallback shows no links rather than possibly the wrong set */}
          <Suspense fallback={<div aria-hidden className="h-11" />}>
            <HeaderNav />
          </Suspense>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
