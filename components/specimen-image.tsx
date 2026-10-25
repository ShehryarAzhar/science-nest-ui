"use client"

import { useState, type ReactNode } from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

// The one wrapper for the illustrations in public/images/ (CLAUDE.md › Design
// › Images). String paths only, never static imports. The box is reserved in
// every state, the image stays hidden until it has loaded, and a failed load
// shows the fallback (or nothing) instead of a broken icon.
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
}) {
  const [status, setStatus] = useState<Status>("loading")

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
          aria-hidden={status === "loading" || undefined}
          className={cn(
            "size-full object-contain",
            status === "loading" && "invisible",
          )}
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
