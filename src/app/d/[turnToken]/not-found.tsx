// Shown when a turn link does not work. Usually it is an old one:
// a newer suggestion came with a new link.
export default function TurnNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink">
        This link is out of date
      </h1>
      <p className="text-base text-muted">
        There is a newer suggestion. Open the latest link you got.
      </p>
    </main>
  );
}
