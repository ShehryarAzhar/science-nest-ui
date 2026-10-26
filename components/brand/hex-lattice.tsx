import { cn } from "@/lib/utils"

// The nest motif (CLAUDE.md › Design › Motif): a thin pointy-top hexagon
// lattice in low-opacity primary, only for the home hero and subject
// headers. One path, built once, so instances never share ids and the home
// hero (spec 18) can draw it in with a stroke dash. Static here

const R = 24 // circumradius
const W = Math.sqrt(3) * R
const VIEW_W = 480
const VIEW_H = 320

function hexagon(cx: number, cy: number) {
  const points = [0, 1, 2, 3, 4, 5].map((i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    return `${(cx + R * Math.cos(angle)).toFixed(2)} ${(cy + R * Math.sin(angle)).toFixed(2)}`
  })
  return `M${points.join(" L")} Z`
}

// Rows 1.5 R apart, odd rows shifted half a cell, with a cell of overflow on
// every side so the slice crop never shows a ragged edge
const LATTICE_PATH = (() => {
  const cells: string[] = []
  for (let row = -1; row * 1.5 * R <= VIEW_H + R; row++) {
    const offset = row % 2 === 0 ? 0 : W / 2
    for (let col = -1; col * W <= VIEW_W + W; col++) {
      cells.push(hexagon(col * W + offset, row * 1.5 * R))
    }
  }
  return cells.join(" ")
})()

export function HexLattice({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
      className={cn("pointer-events-none opacity-20 dark:opacity-25", className)}
    >
      <path
        d={LATTICE_PATH}
        fill="none"
        className="stroke-primary"
        strokeWidth={1}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
