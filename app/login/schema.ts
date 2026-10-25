import { z } from "zod";

// Shared by the login form and the login() action. Only "required": the
// backend has no other rules at login, and extra ones could lock out a valid
// account. Values are never trimmed (usernames are case- and space-exact)
export const loginSchema = z.object({
  username: z.string().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
});

export type LoginValues = z.infer<typeof loginSchema>;

// Shown for every 401 from POST /auth/jwt/create/, instead of SimpleJWT's
// detail: clearer, and it doesn't reveal whether the username exists
export const INVALID_CREDENTIALS_MESSAGE = "Invalid username or password.";
