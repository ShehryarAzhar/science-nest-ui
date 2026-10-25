import type { NextConfig } from "next";

// Validates the env at the start of every dev and build run
import "./lib/env-core";

const nextConfig: NextConfig = {
  /* config options here */
  // Dev only: localhost is trusted by default; without these, pages opened
  // at 127.0.0.1 or the LAN address (e.g. from a phone) never hydrate.
  // Hostnames only, no scheme or port. Update the LAN IP if it changes
  allowedDevOrigins: ["127.0.0.1", "192.168.43.225"],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
