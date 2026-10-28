import type { Metadata } from "next"

import { Dashboard } from "./dashboard"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
}

// Static shell: the schedule loads in the browser, where the time zone is
export default function DashboardPage() {
  return <Dashboard />
}
