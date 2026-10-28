import { cn } from "@/lib/utils"

// The nest motif (CLAUDE.md › Design › Motif): a thin pointy-top hexagon
// lattice in low-opacity primary, only for the home hero and subject
// headers. One path, built once, so instances never share ids. Static by
// default; `drawIn` is for the home hero only (the app's one motion moment)

const R = 24 // circumradius
const W = Math.sqrt(3) * R
export const VIEW_W = 480
export const VIEW_H = 320

function hexagon(cx: number, cy: number) {
  const points = [0, 1, 2, 3, 4, 5].map((i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    return `${(cx + R * Math.cos(angle)).toFixed(2)} ${(cy + R * Math.sin(angle)).toFixed(2)}`
  })
  return `M${points.join(" L")} Z`
}

// Rows 1.5 R apart, odd rows shifted half a cell, with a cell of overflow on
// every side so the slice crop never shows a ragged edge. Also drawn into the
// share image (app/opengraph-image.tsx)
export const LATTICE_PATH = (() => {
  const cells: string[] = []
  for (let row = -1; row * 1.5 * R <= VIEW_H + R; row++) {
    const offset = row % 2 === 0 ? 0 : W / 2
    for (let col = -1; col * W <= VIEW_W + W; col++) {
      cells.push(hexagon(col * W + offset, row * 1.5 * R))
    }
  }
  return cells.join(" ")
})()

// Draw-in: every hexagon traces its outline from one dash as long as its
// perimeter on screen. The stroke doesn't scale (1px), so neither do its
// dashes: the length comes from the svg's rendered scale, read with
// container units (the svg is the size container). The dash exists only
// while the animation runs, so the finished lattice is the static one
const DRAW_IN_CELL = `calc(max(100cqw / ${VIEW_W}, 100cqh / ${VIEW_H}) * ${6 * R})`

export function HexLattice({
  className,
  drawIn = false,
}: {
  className?: string
  drawIn?: boolean
}) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
      className={cn(
        "pointer-events-none opacity-20 dark:opacity-25",
        drawIn && "[container-type:size]",
        className,
      )}
    >
      <path
        d={LATTICE_PATH}
        fill="none"
        className={cn(
          "stroke-primary",
          drawIn && "animate-lattice-draw motion-reduce:animate-none",
        )}
        style={
          drawIn
            ? ({ "--lattice-cell": DRAW_IN_CELL } as React.CSSProperties)
            : undefined
        }
        strokeWidth={1}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
