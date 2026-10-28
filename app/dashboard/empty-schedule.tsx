import { SpecimenImage } from "@/components/specimen-image"
import { BookingLinks } from "./booking-links"

// No weekly classes and no trial lesson
export function EmptySchedule() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-card px-4 py-10 text-center md:py-14">
      <SpecimenImage
        src="/images/empty-schedule.webp"
        alt=""
        width={640}
        height={478}
        sizes="(min-width: 768px) 320px, 240px"
        className="w-60 md:w-80"
      />
      {/* Focused after the last class is deleted (spec 27) */}
      <h2
        id="empty-schedule-heading"
        tabIndex={-1}
        className="mt-6 text-xl outline-none"
      >
        Nothing booked yet
      </h2>
      <p className="mt-2 max-w-[65ch] text-muted-foreground">
        Start with a free 60-minute trial lesson, or book a weekly class
        straight away.
      </p>
      <BookingLinks hasTrialLesson={false} className="mt-6 justify-center" />
    </div>
  )
}
