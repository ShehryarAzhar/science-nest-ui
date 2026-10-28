"use client"

import { useMemo, useRef, useState, type KeyboardEvent } from "react"

// Roving focus for a slot picker laid out in rows. One cell is in the tab
// order; arrow keys only move focus (Space, Enter or a click selects), so
// taken and "Yours" cells can be reached and announced. Up and Down keep the
// column (`col`, e.g. the weekday), skipping rows with nothing there

export type RovingItem = { key: string; col: number }

type Position = { row: number; index: number }

export function useRovingGrid(rows: RovingItem[][], tabStopKey: string | null) {
  const refs = useRef(new Map<string, HTMLElement>())
  const [focusedKey, setFocusedKey] = useState<string | null>(null)

  const positions = useMemo(() => {
    const map = new Map<string, Position>()
    rows.forEach((items, row) =>
      items.forEach(({ key }, index) => map.set(key, { row, index })),
    )
    return map
  }, [rows])

  const activeKey =
    focusedKey && positions.has(focusedKey)
      ? focusedKey
      : tabStopKey && positions.has(tabStopKey)
        ? tabStopKey
        : (rows[0]?.[0]?.key ?? null)

  // undefined: not a navigation key; null: nowhere to go
  function target(key: string, pressed: string): string | null | undefined {
    const position = positions.get(key)
    if (!position) return undefined
    const items = rows[position.row]
    const item = items[position.index]

    switch (pressed) {
      case "ArrowLeft":
        return items[position.index - 1]?.key ?? null
      case "ArrowRight":
        return items[position.index + 1]?.key ?? null
      case "Home":
        return items[0].key
      case "End":
        return items[items.length - 1].key
      case "ArrowUp":
      case "ArrowDown": {
        const step = pressed === "ArrowUp" ? -1 : 1
        const sameCol = items.filter(({ col }) => col === item.col)
        const lane = sameCol.findIndex(({ key: k }) => k === key)
        for (let row = position.row + step; row >= 0 && row < rows.length; row += step) {
          const candidates = rows[row].filter(({ col }) => col === item.col)
          if (candidates.length > 0) {
            return candidates[Math.min(lane, candidates.length - 1)].key
          }
        }
        return null
      }
      default:
        return undefined
    }
  }

  function getItemProps(key: string) {
    return {
      tabIndex: key === activeKey ? 0 : -1,
      ref: (element: HTMLElement | null) => {
        if (element) {
          refs.current.set(key, element)
        } else {
          refs.current.delete(key)
        }
      },
      onFocus: () => setFocusedKey(key),
      onKeyDown: (event: KeyboardEvent) => {
        const next = target(key, event.key)
        if (next === undefined) return
        event.preventDefault()
        if (next) refs.current.get(next)?.focus()
      },
    }
  }

  return { getItemProps }
}
