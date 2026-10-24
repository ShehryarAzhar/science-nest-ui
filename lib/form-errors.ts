import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";

import type { NormalizedError } from "@/lib/drf-errors";

// Form-level server messages live here; read them with
// `errors.root?.server?.message`
export const SERVER_ERROR_KEY = "root.server";

// Puts a normalized backend error onto a react-hook-form form. Each field gets
// all of its messages and the rest goes to `root.server`, one message per line,
// so render both with `whitespace-pre-line`. `fields` lists the form's inputs
// in on-screen order: the first one with an error is focused, which only works
// when its input passes its ref to react-hook-form. `rename` maps backend
// field names to form inputs (e.g. `day` and `time` to `slot`)
export function applyServerErrors<T extends FieldValues>(
  form: Pick<UseFormReturn<T>, "setError" | "clearErrors">,
  error: NormalizedError,
  options: {
    fields: readonly FieldPath<T>[];
    rename?: Record<string, FieldPath<T>>;
  },
) {
  form.clearErrors(SERVER_ERROR_KEY);

  const byField = new Map<FieldPath<T>, string[]>();
  const unmatched: string[] = [];

  for (const [key, messages] of Object.entries(error.fieldErrors)) {
    const target = options.rename?.[key] ?? key;
    const field = options.fields.find((name) => name === target);
    if (field) {
      byField.set(field, [...(byField.get(field) ?? []), ...messages]);
    } else {
      unmatched.push(...messages);
    }
  }

  let focused = false;
  for (const field of options.fields) {
    const messages = byField.get(field);
    if (!messages) {
      continue;
    }
    form.setError(
      field,
      { type: "server", message: messages.join("\n") },
      { shouldFocus: !focused },
    );
    focused = true;
  }

  const formMessages = [...error.formErrors, ...unmatched];
  if (formMessages.length > 0) {
    form.setError(SERVER_ERROR_KEY, {
      type: "server",
      message: formMessages.join("\n"),
    });
  }
}
