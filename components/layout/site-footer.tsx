import Link from "next/link"

import { Logo } from "@/components/brand/logo"

const SUBJECTS = [
  "Biology",
  "Chemistry",
  "Physics",
  "Science",
  "Biochemistry",
  "Molecular Biology",
]

// Static: no request data and no current date (a year would make the
// layout dynamic under Cache Components)
export function SiteFooter() {
  return (
    <footer className="border-t text-sm text-muted-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start md:gap-12 md:px-6">
        <div className="flex items-start gap-3 md:w-80 md:shrink-0">
          <Logo variant="mark" height={32} decorative className="mt-0.5" />
          <p>
            MPhil in Biochemistry and Molecular Biology
            <br />
            8+ years of teaching experience
          </p>
        </div>

        <div className="flex-1">
          <p className="font-semibold text-foreground">Subjects taught</p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {SUBJECTS.map((subject) => (
              <li key={subject}>{subject}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1 md:items-end">
          <Link
            href="/subjects"
            className="inline-flex min-h-11 items-center text-primary underline-offset-6 hover:underline md:min-h-0"
          >
            Subjects
          </Link>
          <p>© Science Nest</p>
        </div>
      </div>
    </footer>
  )
}
