"use client"; // Error screens must be client components (Next.js rule).

import { useEffect } from "react";
import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void; // renders the page again
};

// Shown when something breaks that we did not expect, for example
// the database does not answer. The person gets a calm message and a way
// to try again, not a white screen.
export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    // The details go to the console only, never to the screen:
    // they can contain things a visitor should not see.
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink">
        Something went wrong{" "}
        <span aria-hidden="true">🌧</span>
      </h1>
      <p className="text-base text-muted">
        It is not you. Please try again in a moment.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-2xl bg-brand px-6 py-3 text-base font-semibold text-white"
      >
        Try again
      </button>
      <Link href="/" className="text-sm font-medium text-accent">
        Go to Date Helper
      </Link>
    </main>
  );
}
