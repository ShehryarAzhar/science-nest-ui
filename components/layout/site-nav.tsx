"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MenuIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type NavLink = { href: string; label: string; primary?: boolean }

const GUEST_LINKS: NavLink[] = [
  { href: "/subjects", label: "Subjects" },
  { href: "/login", label: "Log in" },
  { href: "/register", label: "Register", primary: true },
]

const STUDENT_LINKS: NavLink[] = [
  { href: "/subjects", label: "Subjects" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/account", label: "Account" },
]

// Whole segments only, so /subjects/biology marks Subjects but /subjectsx
// doesn't (same rule as the route matching in proxy.ts)
function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

// usePathname suspends on routes with params unknown at build time, so this
// must stay inside the header's <Suspense> (it already is, for the cookie)
export function SiteNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname()
  const links = loggedIn ? STUDENT_LINKS : GUEST_LINKS

  return (
    <>
      <nav aria-label="Main" className="hidden md:block">
        <ul className="flex items-center gap-1">
          {links.map(({ href, label, primary }) => {
            const current = isCurrent(pathname, href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    primary
                      ? cn(buttonVariants(), "ml-2 text-base")
                      : "inline-flex h-9 items-center rounded-md px-3 text-primary transition-colors hover:bg-accent",
                    "underline-offset-6",
                    current && "font-semibold underline decoration-2",
                  )}
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <nav aria-label="Main" className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="h-11 px-3 text-base" />}
          >
            <MenuIcon aria-hidden className="size-5" />
            Menu
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-48">
            {links.map(({ href, label }) => {
              const current = isCurrent(pathname, href)
              return (
                <DropdownMenuItem
                  key={href}
                  render={
                    <Link
                      href={href}
                      aria-current={current ? "page" : undefined}
                    />
                  }
                  className={cn(
                    "text-primary underline-offset-6",
                    current && "font-semibold underline decoration-2",
                  )}
                >
                  {label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </>
  )
}
