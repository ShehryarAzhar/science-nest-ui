import type { ApiErrorKind } from "@/lib/api-client";

// Shared by server actions and Client Components: no server-only imports, and
// the shape is plain data so it can be returned from a server action

export type ErrorKind = ApiErrorKind | "unknown";

export type NormalizedError = {
  kind: ErrorKind;
  status: number | null;
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
};

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Try again.";
export const NETWORK_ERROR_MESSAGE =
  "Couldn't reach the server. Check your connection and try again.";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Flattens nested and list-serializer errors into their strings. Numbers,
// booleans and null are ignored
function collectMessages(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim() === "" ? [] : [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectMessages);
  }
  if (isPlainObject(value)) {
    return Object.values(value).flatMap(collectMessages);
  }
  return [];
}

export function normalizeDrfBody(
  body: unknown,
  status: number | null = null,
): NormalizedError {
  const fieldErrors: Record<string, string[]> = {};
  let formErrors: string[] = [];

  if (typeof body === "string" || Array.isArray(body)) {
    formErrors = collectMessages(body);
  } else if (isPlainObject(body)) {
    // A detail response: SimpleJWT adds `code` and `messages`, which aren't
    // meant for the student
    if (typeof body.detail === "string" && body.detail.trim() !== "") {
      formErrors = [body.detail];
    } else {
      for (const [key, value] of Object.entries(body)) {
        const messages = collectMessages(value);
        if (messages.length === 0) {
          continue;
        }
        if (key === "non_field_errors" || key === "detail") {
          formErrors.push(...messages);
        } else {
          fieldErrors[key] = messages;
        }
      }
    }
  }

  if (formErrors.length === 0 && Object.keys(fieldErrors).length === 0) {
    formErrors = [GENERIC_ERROR_MESSAGE];
  }

  return { kind: "http", status, fieldErrors, formErrors };
}

// Form-level messages, one per line (render with `whitespace-pre-line`)
export function formErrorMessage(error: NormalizedError): string | undefined {
  return error.formErrors.length > 0 ? error.formErrors.join("\n") : undefined;
}

// For spotting a specific backend message, e.g. "This timeslot is already
// booked."
export function hasErrorMessage(
  error: NormalizedError,
  message: string,
): boolean {
  return (
    error.formErrors.includes(message) ||
    Object.values(error.fieldErrors).some((messages) =>
      messages.includes(message),
    )
  );
}
