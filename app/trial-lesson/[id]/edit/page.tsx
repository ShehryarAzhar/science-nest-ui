import { Suspense } from "react";
import type { Metadata } from "next";

import { BookingFrame } from "@/app/classes/booking-frame";
import { BookingShell } from "@/app/classes/booking-shell";
import { SubjectsErrorBoundary } from "@/app/subjects/subjects-error-boundary";
import { getSubjects } from "@/lib/subjects";
import { TrialLoading, TrialNotFound } from "../../trial-states";
import { EditTrialLesson } from "./edit-trial-lesson";

export const metadata: Metadata = {
  title: "Edit trial lesson",
  robots: { index: false },
};

const HEADING = "Edit trial lesson";

// The ids the student API proxy forwards; anything else can't be a lesson
const ID = /^[1-9]\d*$/;

async function EditForm({ trialLessonId }: { trialLessonId: number }) {
  const subjects = await getSubjects();
  return <EditTrialLesson trialLessonId={trialLessonId} subjects={subjects} />;
}

async function EditRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) {
    return (
      <BookingFrame heading={HEADING}>
        <TrialNotFound />
      </BookingFrame>
    );
  }

  const trialLessonId = Number(id);
  return (
    <BookingShell heading={HEADING} trialLessonId={trialLessonId}>
      <SubjectsErrorBoundary>
        <EditForm trialLessonId={trialLessonId} />
      </SubjectsErrorBoundary>
    </BookingShell>
  );
}

// Spec 29, built like the weekly class edit page (spec 26): ids are only
// known per request, so params are awaited inside Suspense and the fallback
// is the prerendered shell. The lesson itself loads in the browser
export default function EditTrialLessonPage({
  params,
}: PageProps<"/trial-lesson/[id]/edit">) {
  return (
    <Suspense
      fallback={
        <BookingFrame heading={HEADING}>
          <TrialLoading />
        </BookingFrame>
      }
    >
      <EditRoute params={params} />
    </Suspense>
  );
}
