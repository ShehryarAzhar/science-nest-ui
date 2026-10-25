import type { Metadata } from "next";
import Link from "next/link";

import { RouteState, routeActionClass } from "@/components/route-state";
import { SpecimenImage } from "@/components/specimen-image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Page not found",
};

// Root not-found: every unmatched URL and any notFound() call. Static, so it
// renders inside the shell without reading request data
export default function NotFound() {
  return (
    <RouteState
      media={
        <SpecimenImage
          src="/images/not-found.webp"
          alt=""
          width={640}
          height={640}
          sizes="240px"
          // Height follows the viewport so the heading, message and links
          // always fit above the fold; on very short screens it's hidden
          // by a static rule (no layout shift)
          className="mb-6 h-[clamp(6rem,24svh,15rem)] [@media(max-height:30rem)]:hidden"
        />
      }
      heading="Page not found"
      description="There's no page at this address. Check the link, or start again from the home page or the subjects list."
      actions={
        <>
          <Link href="/" className={cn(buttonVariants(), routeActionClass)}>
            Home
          </Link>
          <Link
            href="/subjects"
            className={cn(buttonVariants({ variant: "outline" }), routeActionClass)}
          >
            Subjects
          </Link>
        </>
      }
    />
  );
}
