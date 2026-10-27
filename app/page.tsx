import Link from "next/link";
import { CalendarCheckIcon, GraduationCapIcon } from "lucide-react";

import { HexLattice } from "@/components/brand/hex-lattice";
import { routeActionClass } from "@/components/route-state";
import { SpecimenImage } from "@/components/specimen-image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FreeTrialNote } from "./subjects/free-trial-note";
import { SubjectList } from "./subjects/subject-list";
import { SubjectsErrorBoundary } from "./subjects/subjects-error-boundary";

// Public landing page. Static: no cookies, so guests and students see the
// same page, and the booking links send guests through /login?next=… (proxy)

const SECTION = "mx-auto w-full max-w-6xl px-4 py-14 md:px-6 md:py-24";

const STEPS = [
  {
    title: "Book a free trial",
    body: "Choose a subject, a level and a time for a free 60-minute lesson.",
  },
  {
    title: "Choose a weekly class",
    body: "Pick a subject, a level, 40 or 60 minutes, and a weekly time slot.",
  },
  {
    title: "Join your lesson online",
    body: "Lessons run on Zoom or Google Meet. Before each one, your tutor sends the meeting link on WhatsApp to the phone number you registered with, or by email. Your dashboard shows your weekly schedule and cost in your local time.",
  },
];

// Plain links for everyone, with no subject chosen here
function BookingButtons({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      <Link
        href="/trial-lesson/new"
        className={cn(buttonVariants(), routeActionClass)}
      >
        Book a free trial
      </Link>
      <Link
        href="/classes/new"
        className={cn(buttonVariants({ variant: "outline" }), routeActionClass)}
      >
        Book a weekly class
      </Link>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section
        aria-labelledby="home-heading"
        className="relative isolate overflow-hidden border-b border-border"
      >
        <HexLattice
          drawIn
          className="absolute inset-y-0 right-0 -z-10 h-full w-full mask-[linear-gradient(to_left,black,transparent_70%)] md:w-3/5 md:mask-[linear-gradient(to_left,black_40%,transparent)]"
        />
        <div
          className={cn(
            SECTION,
            "grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:gap-12",
          )}
        >
          <div>
            <h1
              id="home-heading"
              className="heading-hero max-w-[20ch] text-2xl sm:text-3xl md:text-4xl"
            >
              Science tutoring from O Level to university
            </h1>
            <p className="mt-5 max-w-[65ch] text-muted-foreground md:text-lg">
              Online lessons in biology, chemistry, physics and science, and in
              biochemistry and molecular biology at university level. Start with
              a free 60-minute trial, then book weekly classes.
            </p>
            {/* The tutor's credentials appear only here on the page */}
            <ul className="mt-6 flex flex-col gap-2">
              <li className="flex items-center gap-3">
                <GraduationCapIcon aria-hidden className="size-5 shrink-0 text-eosin" />
                MPhil in Biochemistry and Molecular Biology
              </li>
              <li className="flex items-center gap-3">
                <CalendarCheckIcon aria-hidden className="size-5 shrink-0 text-eosin" />
                8+ years of teaching experience
              </li>
            </ul>
            <BookingButtons className="mt-8" />
          </div>
          {/* Visible before hydration (LCP); a failed load leaves the lattice */}
          <SpecimenImage
            src="/images/hero-specimen.webp"
            alt="Illustration of stained cells seen through a microscope"
            width={1120}
            height={1120}
            sizes="(min-width: 768px) 416px, 288px"
            loading="eager"
            fetchPriority="high"
            visibleBeforeHydration
            className="mx-auto w-60 sm:w-72 md:w-full"
          />
        </div>
      </section>

      <section aria-labelledby="subjects-heading" className={SECTION}>
        <h2 id="subjects-heading" className="text-xl md:text-2xl">
          Subjects
        </h2>
        <FreeTrialNote className="mt-3" />
        <div className="mt-8 md:mt-10">
          <SubjectsErrorBoundary>
            <SubjectList headingLevel="h3" />
          </SubjectsErrorBoundary>
        </div>
        <Link
          href="/subjects"
          className="mt-4 inline-flex h-11 items-center rounded-md text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          All subjects
        </Link>
      </section>

      <section
        aria-labelledby="how-heading"
        className={cn(SECTION, "border-t border-border")}
      >
        <h2 id="how-heading" className="text-xl md:text-2xl">
          How it works
        </h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map(({ title, body }, index) => (
            <li key={title} className="max-w-[65ch]">
              <span
                aria-hidden
                className="font-heading text-2xl font-semibold text-primary tabular-nums"
              >
                {index + 1}
              </span>
              <h3 className="mt-2 text-lg">{title}</h3>
              <p className="mt-2 text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="start-heading" className={cn(SECTION, "pt-0 md:pt-0")}>
        <div className="rounded-lg bg-secondary p-6 text-secondary-foreground md:p-10">
          <h2 id="start-heading" className="text-xl md:text-2xl">
            Start with a free trial lesson
          </h2>
          <p className="mt-2 max-w-[65ch]">
            Your first lesson is free and lasts 60 minutes. After it, book a
            weekly class at a time that suits you.
          </p>
          <BookingButtons className="mt-6" />
        </div>
      </section>
    </>
  );
}
