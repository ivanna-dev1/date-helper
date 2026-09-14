import Link from "next/link";

// Shown when the token in the address does not match any invitation.
export default function ManageNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink">We can't find this invitation</h1>
      <p className="text-base text-muted">
        The link may be wrong or incomplete.
      </p>
      <Link
        href="/create"
        className="rounded-2xl bg-brand px-6 py-3 text-base font-semibold text-white"
      >
        Create a new one
      </Link>
    </main>
  );
}
