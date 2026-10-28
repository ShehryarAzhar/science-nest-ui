import { Suspense } from "react";
import type { Metadata } from "next";

import { SubjectsErrorBoundary } from "@/app/subjects/subjects-error-boundary";
import { getSubjects } from "@/lib/subjects";
import { BookingFrame } from "../../booking-frame";
import { BookingShell } from "../../booking-shell";
import { ClassLoading, ClassNotFound } from "./class-states";
import { EditWeeklyClass } from "./edit-weekly-class";

export const metadata: Metadata = {
  title: "Edit weekly class",
  robots: { index: false },
};

const HEADING = "Edit weekly class";

// The ids the student API proxy forwards; anything else can't be a class
const ID = /^[1-9]\d*$/;

async function EditForm({ classId }: { classId: number }) {
  const subjects = await getSubjects();
  return <EditWeeklyClass classId={classId} subjects={subjects} />;
}

async function EditRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) {
    return (
      <BookingFrame heading={HEADING}>
        <ClassNotFound />
      </BookingFrame>
    );
  }

  const classId = Number(id);
  return (
    <BookingShell heading={HEADING} classId={classId}>
      <SubjectsErrorBoundary>
        <EditForm classId={classId} />
      </SubjectsErrorBoundary>
    </BookingShell>
  );
}

// Class ids are only known per request, so params are awaited inside
// Suspense: the fallback (heading and a static loading block) is the
// prerendered shell. The class itself loads in the browser
export default function EditWeeklyClassPage({
  params,
}: PageProps<"/classes/[id]/edit">) {
  return (
    <Suspense
      fallback={
        <BookingFrame heading={HEADING}>
          <ClassLoading />
        </BookingFrame>
      }
    >
      <EditRoute params={params} />
    </Suspense>
  );
}
