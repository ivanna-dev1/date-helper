"use client";

import { useState } from "react";
import { cancelInvite } from "@/app/actions";

type CancelInviteProps = {
  secretToken: string;
};

// A quiet "Cancel invitation" link. Cancelling cannot be undone,
// so the first click only asks "Are you sure?".
export function CancelInvite({ secretToken }: CancelInviteProps) {
  const [isAsking, setIsAsking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setIsSending(true);
    setError(null);
    try {
      const result = await cancelInvite(secretToken);
      // On success the page shows the cancelled state by itself.
      if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setIsSending(false);
    }
  }

  if (!isAsking) {
    return (
      <button
        type="button"
        onClick={() => setIsAsking(true)}
        className="py-2 text-sm text-quiet"
      >
        Cancel invitation
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 text-center">
      <p className="text-sm text-ink">
        Cancel this invitation? This can&apos;t be undone.
      </p>
      {error && <p className="text-sm text-accent">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSending}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isSending ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button
          type="button"
          onClick={() => setIsAsking(false)}
          disabled={isSending}
          className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
