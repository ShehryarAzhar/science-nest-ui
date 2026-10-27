"use client"

import { useState, type ReactNode } from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

// The one wrapper for the illustrations in public/images/ (CLAUDE.md › Design
// › Images). String paths only, never static imports. The box is reserved in
// every state, the image stays hidden until it has loaded, and a failed load
// shows the fallback (or nothing) instead of a broken icon.
//
// `visibleBeforeHydration` is for the home hero only: the image isn't hidden
// in the server HTML, so it paints as soon as it arrives, before hydration
// and without JavaScript. next/image replays a load or error from before
// hydration, so a failure still swaps to the fallback afterwards. Until then
// (or without JavaScript) a failed load shows the browser's own broken image,
// an accepted exception for the hero, whose image ships with the app.
//
// Single src for now. If an image later needs <name>-dark.webp, add an
// optional dark src then: render both images and switch with CSS
// (dark:hidden / hidden dark:block), never a JavaScript theme check

type Status = "loading" | "loaded" | "failed"

export function SpecimenImage({
  src,
  alt,
  width,
  height,
  sizes,
  className,
  fallback = null,
  loading = "lazy",
  fetchPriority,
  visibleBeforeHydration = false,
}: {
  src: string
  alt: string
  width: number
  height: number
  sizes?: string
  // Sizes the reserved box; the aspect ratio comes from width and height
  className?: string
  fallback?: ReactNode
  loading?: "lazy" | "eager"
  fetchPriority?: "high" | "low" | "auto"
  visibleBeforeHydration?: boolean
}) {
  const [status, setStatus] = useState<Status>("loading")
  const hidden = status === "loading" && !visibleBeforeHydration

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {status === "failed" ? (
        fallback
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={loading}
          fetchPriority={fetchPriority}
          aria-hidden={hidden || undefined}
          className={cn("size-full object-contain", hidden && "invisible")}
          // next/image replays loads that finished before hydration, and a
          // broken image also counts as complete, so check it has pixels
          onLoad={(event) =>
            setStatus(
              event.currentTarget.naturalWidth > 0 ? "loaded" : "failed",
            )
          }
          onError={() => setStatus("failed")}
        />
      )}
    </div>
  )
}
