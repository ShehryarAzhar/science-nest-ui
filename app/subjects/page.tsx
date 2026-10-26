import type { Metadata } from "next";
import { BookOpenIcon } from "lucide-react";

import { getSubjects } from "@/lib/subjects";
import { FreeTrialNote } from "./free-trial-note";
import { SubjectCard } from "./subject-card";
import { SubjectsErrorBoundary } from "./subjects-error-boundary";
import { SubjectsPanel } from "./subjects-panel";

export const metadata: Metadata = {
  title: "Subjects",
};

// Prerendered from the cached subjects list. getSubjects() throws on
// failure, and the boundary turns that into an inline panel at request time
async function SubjectList() {
  const subjects = await getSubjects();

  if (subjects.length === 0) {
    return (
      <SubjectsPanel
        icon={<BookOpenIcon aria-hidden className="size-5 shrink-0" />}
        heading="No subjects yet"
      >
        <p>No subjects are listed yet. Check back soon.</p>
      </SubjectsPanel>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
      {subjects.map((subject) => (
        <SubjectCard key={subject.id} subject={subject} />
      ))}
    </ul>
  );
}

export default function SubjectsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <header className="max-w-[65ch]">
        <h1 className="text-2xl md:text-3xl">Subjects</h1>
        <p className="mt-3 text-muted-foreground md:text-lg">
          Biology, chemistry, physics and science from O Level to university,
          taught by a tutor with an MPhil in Biochemistry and Molecular Biology
          and 8+ years of teaching experience.
        </p>
        <FreeTrialNote className="mt-4" />
      </header>
      <div className="mt-8 md:mt-10">
        <SubjectsErrorBoundary>
          <SubjectList />
        </SubjectsErrorBoundary>
      </div>
    </div>
  );
}
