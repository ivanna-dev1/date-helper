"use client";

import { useState } from "react";
import { answerSuggestion } from "@/app/actions";

type SuggestionDecisionProps = {
  secretToken: string;
};

// Two buttons for the author: accept or decline the suggestion.
// After a click the server saves the decision and the page shows it,
// so this component does not need to remember the result.
export function SuggestionDecision({ secretToken }: SuggestionDecisionProps) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(accept: boolean) {
    setIsSending(true);
    setError(null);
    try {
      const result = await answerSuggestion(secretToken, accept);
      if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {error && <p className="text-center text-sm text-accent">{error}</p>}

      <button
        type="button"
        onClick={() => decide(true)}
        disabled={isSending}
        className="rounded-2xl bg-brand py-4 text-base font-semibold text-white disabled:opacity-60"
      >
        {isSending ? "Saving…" : "Accept"}
      </button>
      <button
        type="button"
        onClick={() => decide(false)}
        disabled={isSending}
        className="py-2 text-sm text-quiet disabled:opacity-60"
      >
        Decline
      </button>
    </div>
  );
}
