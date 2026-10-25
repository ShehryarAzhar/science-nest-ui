"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/error-state";

// Errors below the root layout; the header and footer stay in place
export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    // Dev console only; the page never shows the error itself
    console.error(error);
  }, [error]);

  return <ErrorState error={error} retry={retry} />;
}
