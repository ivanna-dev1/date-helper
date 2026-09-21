"use client";

import { useState } from "react";
import { answerTurn, type TurnKey } from "@/app/actions";
import { PLACE_NAME_MAX_LENGTH } from "@/lib/inviteRules";
import { toUtcString } from "@/lib/time";

type TurnDecisionProps = {
  turnKey: TurnKey; // the link this person came by: it decides the rights
  currentTime: string | null; // ISO string of the suggestion on the table
  currentPlace: string | null;
};

const fieldStyle =
  "rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none placeholder:text-quiet focus:border-accent";
const quietButton =
  "w-full rounded-xl border border-line py-3 text-sm font-medium text-muted disabled:opacity-60";

// "2026-12-20T16:00:00.000Z" → "2026-12-20T18:00" in the reader's own zone,
// the format of <input type="datetime-local">. Runs only in a click handler,
// so it is always in the browser and knows the zone.
function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * The answer to the latest suggestion: accept, decline, or suggest
 * something else. The same component works for both people — which
 * person is acting comes from the link (turnKey), not from the screen.
 *
 * After any move the server refreshes the page, so the new state shows
 * by itself and this component does not keep the result.
 */
export function TurnDecision({
  turnKey,
  currentTime,
  currentPlace,
}: TurnDecisionProps) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  // The earliest time the picker allows: past days and hours are greyed out.
  const [minTime, setMinTime] = useState("");

  async function send(decision: "accept" | "decline" | "counter") {
    setIsSending(true);
    setError(null);
    try {
      const result = await answerTurn({
        key: turnKey,
        decision,
        // The browser knows the zone, so the time turns into UTC here.
        proposedTime: decision === "counter" ? toUtcString(time) : undefined,
        proposedPlace: decision === "counter" ? place : undefined,
      });
      if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setIsSending(false);
    }
  }

  function openSuggestion() {
    // Start from the suggestion on the table: people usually change one
    // thing, not both.
    setTime(currentTime ? toLocalInputValue(currentTime) : "");
    setPlace(currentPlace ?? "");
    setMinTime(toLocalInputValue(new Date().toISOString()));
    setError(null);
    setIsSuggesting(true);
  }

  if (isSuggesting) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          send("counter");
        }}
        className="flex w-full flex-col gap-3 text-left"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Your time
          </span>
          <input
            type="datetime-local"
            value={time}
            min={minTime}
            onChange={(event) => setTime(event.target.value)}
            className={fieldStyle}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Your place
          </span>
          <input
            type="text"
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            maxLength={PLACE_NAME_MAX_LENGTH}
            className={fieldStyle}
          />
        </label>

        {error && <p className="text-center text-sm text-accent">{error}</p>}

        <button
          type="submit"
          disabled={isSending}
          className="rounded-2xl bg-brand py-4 text-base font-semibold text-white disabled:opacity-60"
        >
          {isSending ? "Sending…" : "Send my suggestion"}
        </button>
        <button
          type="button"
          onClick={() => setIsSuggesting(false)}
          disabled={isSending}
          className="py-2 text-sm text-quiet"
        >
          ← Back
        </button>
      </form>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {error && <p className="text-center text-sm text-accent">{error}</p>}

      <button
        type="button"
        onClick={() => send("accept")}
        disabled={isSending}
        className="rounded-2xl bg-brand py-4 text-base font-semibold text-white disabled:opacity-60"
      >
        {isSending ? "Saving…" : "Accept"}
      </button>
      <button
        type="button"
        onClick={openSuggestion}
        disabled={isSending}
        className={quietButton}
      >
        Suggest something else
      </button>
      <button
        type="button"
        onClick={() => send("decline")}
        disabled={isSending}
        className="py-2 text-sm text-quiet disabled:opacity-60"
      >
        Decline
      </button>
    </div>
  );
}
