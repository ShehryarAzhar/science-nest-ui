import { isSupportedCountry, isValidPhoneNumber } from "libphonenumber-js/max";
import countryNames from "react-phone-number-input/locale/en";
import { z } from "zod";

// Shared by the register form and the register() action. Field names match
// the backend's, so its errors land on the right inputs without renaming.
// Only "required" and format checks that can't drift from the backend:
// username, name and password rules (Django's validators) are the backend's

// Required, but sent as typed: a value of only spaces counts as empty
function requiredText(message: string) {
  return z.string().refine((value) => value.trim() !== "", message);
}

// The backend's rule is an optional `+` then 7–15 digits. The form always
// sends E.164, so the `+` is required here
const E164 = /^\+[1-9]\d{6,14}$/;

// `max` metadata: checks real number patterns per country, not just length
function isValidE164(value: string): boolean {
  return E164.test(value) && isValidPhoneNumber(value);
}

const baseFields = {
  first_name: requiredText("Enter your first name."),
  last_name: requiredText("Enter your last name."),
  username: requiredText("Enter a username."),
  email: z
    .string()
    .min(1, "Enter your email address.")
    .pipe(z.email("Enter a valid email address.")),
  // Never trimmed
  password: z.string().min(1, "Enter a password."),
};

// What the action re-checks and sends: no confirm field, no country
export const registerSchema = z.object({
  ...baseFields,
  phone_number: z
    .string()
    .min(1, "Enter your phone number.")
    .refine(isValidE164, "Enter a valid phone number."),
});

export type RegisterValues = z.infer<typeof registerSchema>;

export function countryName(country: string): string | undefined {
  return isSupportedCountry(country)
    ? (countryNames as Record<string, string | undefined>)[country]
    : undefined;
}

const NO_COUNTRY_MESSAGE =
  "Choose your country, or start with + and your country code.";

type CrossFieldValues = {
  phone_number?: unknown;
  phone_country?: unknown;
  password?: unknown;
  confirm_password?: unknown;
};

// The browser form adds the confirm field (never sent) and the selected
// country (for the message). Cross-field checks run even when another field
// failed, so an empty submit shows every message at once
export const registerFormSchema = z
  .object({
    ...baseFields,
    // E.164 from the phone input, "" when empty, or the drafted local digits
    // while no country is selected
    phone_number: z.string().min(1, "Enter your phone number."),
    phone_country: z.string().optional(),
    confirm_password: z.string().min(1, "Enter your password again."),
  })
  .superRefine(
    (values: CrossFieldValues, ctx) => {
      const { phone_number, phone_country, password, confirm_password } =
        values;

      if (typeof phone_number === "string" && phone_number !== "") {
        const name =
          typeof phone_country === "string"
            ? countryName(phone_country)
            : undefined;
        if (!name && !phone_number.startsWith("+")) {
          // No country and no `+`: the phone field keeps these digits as a
          // draft and doesn't guess a country from them
          ctx.addIssue({
            code: "custom",
            path: ["phone_country"],
            message: NO_COUNTRY_MESSAGE,
          });
        } else if (!isValidE164(phone_number)) {
          ctx.addIssue({
            code: "custom",
            path: ["phone_number"],
            message: name
              ? `Enter a valid phone number for ${name}.`
              : "Enter a valid phone number.",
          });
        }
      }

      if (
        typeof confirm_password === "string" &&
        confirm_password !== "" &&
        confirm_password !== password
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["confirm_password"],
          message: "Passwords don't match.",
        });
      }
    },
    { when: () => true },
  );

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
