"use client";

import { useEffect } from "react";
import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    // Details go to the console only; they may be sensitive.
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
