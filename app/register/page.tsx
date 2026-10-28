import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/app/register/register-form";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Register",
  // Reachable, but kept out of search results. Not disallowed in robots.txt,
  // so crawlers can read this
  robots: { index: false, follow: true },
};

// Static: the form reads `next` and guesses the country in the browser, so
// nothing here depends on the request. Guests only (proxy.ts sends students
// to the dashboard)
export default function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-6 md:py-12">
      <div className="rounded-lg border bg-card p-6">
        {/* Decorative, and hidden on short screens, as on the login page */}
        <Logo
          variant="vertical"
          height={64}
          decorative
          className="mx-auto mb-4 block [@media(max-height:40rem)]:hidden"
        />
        <h1 className="text-center text-xl md:text-2xl">Create your account</h1>
        <div className="mt-6">
          <RegisterForm />
        </div>
      </div>
      <p className="mt-6 text-center text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
