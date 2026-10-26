import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";
import { RegisterLink } from "@/app/login/register-link";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Log in",
};

// Static: the form reads `next` itself at submit time, so nothing here
// depends on the request. Guests only (proxy.ts sends students to the
// dashboard)
export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-6 md:py-12">
      <div className="rounded-lg border bg-card p-6">
        {/* Decorative: the header's logo link already names the site. Hidden
            on short screens by a static rule, so the heading, fields and
            button always fit above the fold; it carries its own margin, so
            hiding it removes the gap too */}
        <Logo
          variant="vertical"
          height={64}
          decorative
          className="mx-auto mb-4 block [@media(max-height:40rem)]:hidden"
        />
        <h1 className="text-center text-xl md:text-2xl">Log in</h1>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
      <p className="mt-6 text-center text-muted-foreground">
        New to Science Nest? <RegisterLink />
      </p>
    </div>
  );
}
