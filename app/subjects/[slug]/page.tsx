import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeftIcon } from "lucide-react";

import { HexLattice } from "@/components/brand/hex-lattice";
import { Logo } from "@/components/brand/logo";
import { routeActionClass } from "@/components/route-state";
import { SpecimenImage } from "@/components/specimen-image";
import { buttonVariants } from "@/components/ui/button";
import { formatUsd } from "@/lib/format-usd";
import {
  publicPageMetadata,
  subjectDescription,
  SUBJECTS_DESCRIPTION,
} from "@/lib/site-metadata";
import { getSubjects, type Subject } from "@/lib/subjects";
import { cn } from "@/lib/utils";
import { FreeTrialNote } from "../free-trial-note";
import { LevelBadges } from "../level-badges";
import { SubjectsErrorBoundary } from "../subjects-error-boundary";

// Every slug in the cached list is prerendered. Slugs added to the backend
// later render on their first request once the list revalidates. Cache
// Components rejects an empty list here, so say why instead
export async function generateStaticParams() {
  const subjects = await getSubjects();
  if (subjects.length === 0) {
    throw new Error(
      "No subjects returned from API_BASE_URL; /subjects/[slug] needs at least one to prerender.",
    );
  }
  return subjects.map(({ slug }) => ({ slug }));
}

// The one try/catch around getSubjects(): a throw here would replace the
// inline error panel with the app error page. It's safe because the page
// body still throws into SubjectsErrorBoundary, so a build without the
// backend still fails and a failed revalidation still keeps the old page.
// An unknown slug gets the not-found title itself: the page's notFound()
// only streams it in later, after the HTML <title>. The fallback has no
// canonical, since the slug may not exist
export async function generateMetadata({
  params,
}: PageProps<"/subjects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const subject = (await getSubjects()).find((s) => s.slug === slug);
    return subject
      ? publicPageMetadata({
          title: subject.name,
          description: subjectDescription(subject),
          path: `/subjects/${subject.slug}`,
        })
      : { title: "Page not found" };
  } catch {
    return { title: "Subjects", description: SUBJECTS_DESCRIPTION };
  }
}

// Plain text only: each non-blank line becomes a paragraph
function descriptionParagraphs(description: string) {
  return description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function SubjectHeader({ subject }: { subject: Subject }) {
  const { name, slug, levels, price_40_min, price_60_min } = subject;

  return (
    <header className="relative overflow-hidden border-b border-border pt-6 pb-14 md:pt-8 md:pb-16">
      <HexLattice className="absolute inset-y-0 right-0 -z-10 h-full w-full mask-[linear-gradient(to_left,black,transparent_70%)] md:w-3/5 md:mask-[linear-gradient(to_left,black_40%,transparent)]" />
      <Link
        href="/subjects"
        className="-ml-1 inline-flex h-11 items-center gap-1 rounded-md px-1 text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeftIcon aria-hidden className="size-4" />
        Subjects
      </Link>
      <h1 className="mt-6 text-2xl md:mt-8 md:text-3xl">{name}</h1>
      <LevelBadges levels={levels} className="mt-4" />
      <dl className="mt-8 flex gap-10">
        <div>
          <dt className="text-sm text-muted-foreground">40 min</dt>
          <dd className="text-xl font-semibold tabular-nums">
            {formatUsd(price_40_min)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">60 min</dt>
          <dd className="text-xl font-semibold tabular-nums">
            {formatUsd(price_60_min)}
          </dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/trial-lesson/new?subject=${slug}`}
          className={cn(buttonVariants(), routeActionClass)}
        >
          Book a free trial
        </Link>
        <Link
          href={`/classes/new?subject=${slug}`}
          className={cn(buttonVariants({ variant: "outline" }), routeActionClass)}
        >
          Book a weekly class
        </Link>
      </div>
      <FreeTrialNote className="mt-4" />
    </header>
  );
}

async function SubjectDetail({
  params,
}: {
  params: PageProps<"/subjects/[slug]">["params"];
}) {
  const { slug } = await params;
  const subject = (await getSubjects()).find((s) => s.slug === slug);
  if (!subject) notFound();

  const paragraphs = descriptionParagraphs(subject.description);

  return (
    <>
      <SubjectHeader subject={subject} />
      <div className="grid grid-cols-1 gap-6 py-10 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-10 md:py-14">
        <SpecimenImage
          src={`/images/subjects/${slug}.webp`}
          alt=""
          width={480}
          height={480}
          sizes="240px"
          className="w-48 md:w-full"
          fallback={
            <div className="flex size-full items-center justify-center">
              <Logo variant="mark" height={80} decorative />
            </div>
          }
        />
        <div className="max-w-[65ch]">
          {paragraphs.length > 0 && (
            <div className="flex flex-col gap-4 md:text-lg">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}
          <p
            className={cn(
              "text-muted-foreground",
              paragraphs.length > 0 && "mt-6",
            )}
          >
            Taught by a tutor with an MPhil in Biochemistry and Molecular
            Biology and 8+ years of teaching experience.
          </p>
        </div>
      </div>
    </>
  );
}

// The route's App Shell, shared by every link into /subjects/[slug], can't
// know the slug, so params needs a Suspense boundary even with
// generateStaticParams. Prerendered slugs still load with the full page;
// the fallback shows only during a client navigation. Static on purpose:
// CLAUDE.md › Design › Motion allows no pulse
function SubjectDetailFallback() {
  return (
    <div role="status" className="pt-6 pb-14 md:pt-8 md:pb-16">
      <span className="sr-only">Loading…</span>
      <div aria-hidden>
        <div className="h-11" />
        <div className="mt-6 h-10 w-1/2 max-w-sm rounded-md bg-muted md:mt-8 md:h-12" />
        <div className="mt-4 h-6 w-48 rounded-full bg-muted" />
        <div className="mt-8 h-14 w-56 rounded-md bg-muted" />
        <div className="mt-6 h-11 w-full rounded-md bg-muted sm:w-80" />
      </div>
    </div>
  );
}

export default function SubjectPage({ params }: PageProps<"/subjects/[slug]">) {
  return (
    <div className="isolate mx-auto w-full max-w-6xl px-4 md:px-6">
      <SubjectsErrorBoundary standalone>
        <Suspense fallback={<SubjectDetailFallback />}>
          <SubjectDetail params={params} />
        </Suspense>
      </SubjectsErrorBoundary>
    </div>
  );
}
