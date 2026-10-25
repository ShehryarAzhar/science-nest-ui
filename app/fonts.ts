import { Atkinson_Hyperlegible_Next, Source_Serif_4 } from "next/font/google";

// Shared by the root layout and global-error, which renders its own document
export const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "600"],
  fallback: ["system-ui", "sans-serif"],
});
