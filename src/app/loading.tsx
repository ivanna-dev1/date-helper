export default function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <span aria-hidden="true" className="animate-pulse text-4xl">
        ✨
      </span>
      <p role="status" className="text-sm text-muted">
        Loading…
      </p>
    </main>
  );
}
