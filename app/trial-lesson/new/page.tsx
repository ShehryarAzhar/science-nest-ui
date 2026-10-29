import type { Metadata } from "next";

import { BookingShell } from "@/app/classes/booking-shell";
import { SubjectsErrorBoundary } from "@/app/subjects/subjects-error-boundary";
import { getSubjects } from "@/lib/subjects";
import { TrialLessonBooking } from "./trial-lesson-booking";
import { TrialLessonForm } from "../trial-lesson-form";

export const metadata: Metadata = {
  title: "Book a free trial",
  robots: { index: false },
};

// Subjects come from the cached public list, so the page prerenders.
// The schedule, availability, local times and `?subject=` are read in the
// browser
async function TrialForm() {
  const subjects = await getSubjects();
  return <TrialLessonForm subjects={subjects} />;
}

// The shell is a Client Component so a 403 from the schedule or availability
// can replace the whole page, heading included. The form is a slot: a
// student who already has a trial lesson sees it without the subject list,
// and a failed subjects read only replaces the form
export default function BookTrialLessonPage() {
  return (
    <BookingShell heading="Book a free trial" schedule>
      <TrialLessonBooking
        form={
          <SubjectsErrorBoundary>
            <TrialForm />
          </SubjectsErrorBoundary>
        }
      />
    </BookingShell>
  );
}
