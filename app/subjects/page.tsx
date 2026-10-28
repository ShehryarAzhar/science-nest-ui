import type { Metadata } from "next";

import { publicPageMetadata, SUBJECTS_DESCRIPTION } from "@/lib/site-metadata";
import { FreeTrialNote } from "./free-trial-note";
import { SubjectList } from "./subject-list";
import { SubjectsErrorBoundary } from "./subjects-error-boundary";

export const metadata: Metadata = publicPageMetadata({
  title: "Subjects",
  description: SUBJECTS_DESCRIPTION,
  path: "/subjects",
});

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
