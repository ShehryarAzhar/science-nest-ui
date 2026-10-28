import type { Metadata } from "next";

import { SubjectsErrorBoundary } from "@/app/subjects/subjects-error-boundary";
import { getSubjects } from "@/lib/subjects";
import { BookingShell } from "../booking-shell";
import { WeeklyClassForm } from "../weekly-class-form";

export const metadata: Metadata = {
  title: "Book a weekly class",
  robots: { index: false },
};

// Subjects come from the cached public list, so the page prerenders.
// Availability, local times and `?subject=` are read in the browser
async function BookingForm() {
  const subjects = await getSubjects();
  return <WeeklyClassForm subjects={subjects} />;
}

// The shell is a Client Component so a 403 from availability can replace
// the whole page, heading included. A failed subjects read keeps the heading
// and shows the subjects panel in place of the form
export default function BookWeeklyClassPage() {
  return (
    <BookingShell heading="Book a weekly class">
      <SubjectsErrorBoundary>
        <BookingForm />
      </SubjectsErrorBoundary>
    </BookingShell>
  );
}
