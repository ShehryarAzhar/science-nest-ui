const DEFAULT_RETURN_PATH = "/dashboard";

// Pages a just-logged-in user shouldn't return to (proxy.ts would only
// redirect them to the dashboard again)
const GUEST_ONLY_PREFIXES = ["/login", "/register"];

// Only an http(s) base gives the parser its usual path rules; the host is
// never contacted
const BASE = "http://return-path.invalid";

// Turns an untrusted `next` value into a same-site path, or the dashboard.
// Guards against open redirects such as `https://evil.com`, `//evil.com`,
// `/\evil.com` (browsers read `\` as `/`) and `/\t/evil.com` (the URL parser
// drops tabs and newlines)
export function safeReturnPath(next: unknown): string {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return DEFAULT_RETURN_PATH;
  }

  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return DEFAULT_RETURN_PATH;
  }

  // Dot segments can still collapse to `//host` (e.g. `/.//evil.com`)
  if (url.origin !== BASE || url.pathname.startsWith("//")) {
    return DEFAULT_RETURN_PATH;
  }

  // Whole segments only, same rule as proxy.ts
  const guestOnly = GUEST_ONLY_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  );
  if (guestOnly) {
    return DEFAULT_RETURN_PATH;
  }

  return url.pathname + url.search;
}
