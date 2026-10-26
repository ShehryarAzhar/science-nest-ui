"use client"

import Link from "next/link"

import { useLocationSearch } from "@/app/login/use-location-search"

// Carries `next` on to /register, so a guest who registers first still ends
// up where they were going. register() validates it on the server
export function RegisterLink() {
  const next = useLocationSearch().get("next")
  const href = next ? `/register?${new URLSearchParams({ next })}` : "/register"

  return (
    <Link
      href={href}
      className="font-semibold text-primary underline underline-offset-4"
    >
      Register
    </Link>
  )
}
