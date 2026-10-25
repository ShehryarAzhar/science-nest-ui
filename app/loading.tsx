// Root loading UI while a page streams in. Static on purpose: CLAUDE.md ›
// Design › Motion allows no spinner, shimmer or pulse. flex-1 fills <main>,
// so the footer stays put on short pages
export default function Loading() {
  return (
    <div
      role="status"
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6"
    >
      <span className="sr-only">Loading…</span>
      <div aria-hidden className="flex flex-col gap-6">
        <div className="h-8 w-1/2 max-w-sm rounded-md bg-muted" />
        <div className="flex flex-col gap-3">
          <div className="h-4 w-full max-w-[65ch] rounded-md bg-muted" />
          <div className="h-4 w-3/4 max-w-[48ch] rounded-md bg-muted" />
        </div>
        <div className="h-48 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
