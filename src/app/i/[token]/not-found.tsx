import Link from "next/link";

// Shown when the link does not match any invitation.
export default function InviteNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink">This invitation doesn't exist</h1>
      <p className="text-base text-muted">
        The link may be wrong or incomplete. Ask the person who sent it.
      </p>
      <Link href="/" className="text-sm font-medium text-accent">
        Go to Date Helper
      </Link>
    </main>
  );
}
