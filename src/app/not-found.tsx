import Link from "next/link";

// Shown for any address that does not exist, for example /hello.
// Invitation links have their own, more exact messages next to their pages.
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink">
        This page doesn&apos;t exist
      </h1>
      <p className="text-base text-muted">
        Check the link, or start from the home page.
      </p>
      <Link href="/" className="text-sm font-medium text-accent">
        Go to Date Helper
      </Link>
    </main>
  );
}
