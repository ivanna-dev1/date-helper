// Shown when the friend link does not match any date.
export default function FriendNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink">
        This link doesn&apos;t work
      </h1>
      <p className="text-base text-muted">
        It may be wrong or incomplete. Ask the person who sent it.
      </p>
    </main>
  );
}
