import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "600"],
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "Science Nest",
    template: "%s · Science Nest",
  },
  description:
    "Science tutoring in Biology, Chemistry, Physics, Science, Biochemistry and Molecular Biology. Book a free 60-minute trial lesson, then weekly classes online.",
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
