// Shown while a page waits for the database. Next.js wraps every page
// below this folder in a Suspense boundary with this as the fallback,
// so one file covers the invitation and the author pages.
export default function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <span aria-hidden="true" className="animate-pulse text-4xl">
        ✨
      </span>
      {/* role="status": screen readers read this text out. */}
      <p role="status" className="text-sm text-muted">
        Loading…
      </p>
    </main>
  );
}
