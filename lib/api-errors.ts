import "server-only";

import { ApiError } from "@/lib/api-client";
import {
  GENERIC_ERROR_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  normalizeDrfBody,
  type NormalizedError,
} from "@/lib/drf-errors";

// Turns anything caught around an API call into the shared error shape. A
// server action returns the result to its Client Component as is
export function normalizeApiError(error: unknown): NormalizedError {
  const fallback = (
    kind: NormalizedError["kind"],
    status: number | null,
    message: string,
  ): NormalizedError => ({
    kind,
    status,
    fieldErrors: {},
    formErrors: [message],
  });

  if (!(error instanceof ApiError)) {
    // Never copy the error's own message: it may hold internal details
    return fallback("unknown", null, GENERIC_ERROR_MESSAGE);
  }

  switch (error.kind) {
    case "http": {
      const status = error.status ?? null;
      // An HTML error page or an empty body has nothing to show
      if (error.nonJson || error.body === undefined) {
        return fallback("http", status, GENERIC_ERROR_MESSAGE);
      }
      return normalizeDrfBody(error.body, status);
    }
    case "network":
      return fallback("network", null, NETWORK_ERROR_MESSAGE);
    case "invalid_response":
      return fallback("invalid_response", null, GENERIC_ERROR_MESSAGE);
  }
}
