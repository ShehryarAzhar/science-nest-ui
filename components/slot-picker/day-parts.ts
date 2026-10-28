// Parts of the day both slot pickers group their hours under, by local
// start hour (specs 23 and 24)

export type DayPart = {
  id: "night" | "morning" | "afternoon" | "evening"
  label: string
  startHour: number
}

// By local start hour: six hours each
export const DAY_PARTS: readonly DayPart[] = [
  { id: "night", label: "Night", startHour: 0 },
  { id: "morning", label: "Morning", startHour: 6 },
  { id: "afternoon", label: "Afternoon", startHour: 12 },
  { id: "evening", label: "Evening", startHour: 18 },
]

export function dayPartOf(hour: number): DayPart {
  return DAY_PARTS[Math.floor(hour / 6)]
}

// With nothing selected, keyboard focus starts on the first slot at or after
// this local time
export const DAYTIME_START_MINUTES = 8 * 60
