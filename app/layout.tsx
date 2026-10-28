import type { Metadata } from "next";
import "./globals.css";
import { atkinson, sourceSerif } from "./fonts";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { env } from "@/lib/env";
import {
  BASE_OPEN_GRAPH,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/site-metadata";
import { cn } from "@/lib/utils";

// Site-wide defaults. Public pages add their own canonical and openGraph
// through publicPageMetadata(); the others keep these, with the root
// opengraph-image filled in by Next
export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: BASE_OPEN_GRAPH,
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the class and color-scheme on <html> before hydration
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", sourceSerif.variable, atkinson.variable)}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <QueryProvider>
            <a
              href="#main-content"
              className="sr-only rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
            >
              Skip to content
            </a>
            <SiteHeader />
            {/* Pages render inside this <main> and never add their own */}
            <main
              id="main-content"
              tabIndex={-1}
              className="flex flex-1 flex-col focus:outline-none"
            >
              {children}
            </main>
            <SiteFooter />
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
