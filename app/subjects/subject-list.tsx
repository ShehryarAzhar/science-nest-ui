import { BookOpenIcon } from "lucide-react";

import { getSubjects } from "@/lib/subjects";
import { SubjectCard } from "./subject-card";
import { SubjectsPanel } from "./subjects-panel";

// The subject grid shared by /subjects and the home page. Prerendered from the
// cached subjects list. getSubjects() throws on failure, and the caller's
// SubjectsErrorBoundary turns that into an inline panel at request time.
// headingLevel is h3 where the grid sits under a section heading
export async function SubjectList({
  headingLevel = "h2",
}: {
  headingLevel?: "h2" | "h3";
}) {
  const subjects = await getSubjects();

  if (subjects.length === 0) {
    return (
      <SubjectsPanel
        icon={<BookOpenIcon aria-hidden className="size-5 shrink-0" />}
        heading="No subjects yet"
        headingLevel={headingLevel}
      >
        <p>No subjects are listed yet. Check back soon.</p>
      </SubjectsPanel>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          headingLevel={headingLevel}
        />
      ))}
    </ul>
  );
}
