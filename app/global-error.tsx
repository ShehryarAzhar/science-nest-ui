"use client";

import "./globals.css";
import { atkinson, sourceSerif } from "./fonts";
import { Logo } from "@/components/brand/logo";
import { ErrorState } from "@/components/error-state";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

// Replaces the root layout when it fails, so it brings its own document,
// styles, fonts and theme (next-themes' pre-paint script via ThemeProvider)
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", sourceSerif.variable, atkinson.variable)}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <main className="flex flex-1 flex-col">
            <ErrorState
              error={error}
              retry={retry}
              fullReloadHome
              media={<Logo variant="vertical" height={72} className="mb-6" />}
            />
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
