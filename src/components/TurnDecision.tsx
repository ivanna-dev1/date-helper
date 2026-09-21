"use client";

import { useState } from "react";
import type { WhoPays } from "@/generated/prisma/enums";
import { answerTurn, type TurnKey } from "@/app/actions";
import { PayChips } from "@/components/PayChips";
import {
  PLACE_NAME_MAX_LENGTH,
  PLACE_NOTE_MAX_LENGTH,
  RESPONSE_MESSAGE_MAX_LENGTH,
} from "@/lib/inviteRules";
import { toUtcString } from "@/lib/time";
import {
  toPayChoice,
  toWhoPays,
  type PayChoice,
  type Viewer,
} from "@/lib/whoPays";

type TurnDecisionProps = {
  turnKey: TurnKey; // the link this person came by: it decides the rights
  viewer: Viewer; // who is answering, for the "My treat" words
  currentTime: string | null; // ISO string of the suggestion on the table
  currentPlace: string | null;
  currentPlaceNote: string | null;
  currentWhoPays: WhoPays | null;
};

const labelStyle = "text-xs font-medium uppercase tracking-wide text-muted";
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
 * A few words can go with any move. The suggestion form has the same
 * fields as the author's form: time, place, a hint to the place, who pays.
 *
 * After any move the server refreshes the page, so the new state shows
 * by itself and this component does not keep the result.
 */
export function TurnDecision({
  turnKey,
  viewer,
  currentTime,
  currentPlace,
  currentPlaceNote,
  currentWhoPays,
}: TurnDecisionProps) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [placeNote, setPlaceNote] = useState("");
  const [payChoice, setPayChoice] = useState<PayChoice>(null);
  // Who pays is sent only after a click on a chip. Otherwise it stays as it
  // is, so "Olia is treating" is not lost when Max only changes the place.
  const [isPayTouched, setIsPayTouched] = useState(false);
  const [message, setMessage] = useState("");
  // The earliest time the picker allows: past days and hours are greyed out.
  const [minTime, setMinTime] = useState("");

  async function send(decision: "accept" | "decline" | "counter") {
    setIsSending(true);
    setError(null);
    const isCounter = decision === "counter";
    try {
      const result = await answerTurn({
        key: turnKey,
        decision,
        // The browser knows the zone, so the time turns into UTC here.
        proposedTime: isCounter ? toUtcString(time) : undefined,
        proposedPlace: isCounter ? place : undefined,
        proposedPlaceNote: isCounter ? placeNote : undefined,
        whoPays:
          isCounter && isPayTouched ? toWhoPays(payChoice, viewer) : undefined,
        message,
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
    // thing, not all of them.
    setTime(currentTime ? toLocalInputValue(currentTime) : "");
    setPlace(currentPlace ?? "");
    setPlaceNote(currentPlaceNote ?? "");
    setPayChoice(toPayChoice(currentWhoPays, viewer));
    setIsPayTouched(false);
    setMinTime(toLocalInputValue(new Date().toISOString()));
    setError(null);
    setIsSuggesting(true);
  }

  // A few words go with any move, so the field is in both views.
  const messageField = (
    <label className="flex flex-col gap-1.5 text-left">
      <span className={labelStyle}>A few words — optional</span>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        maxLength={RESPONSE_MESSAGE_MAX_LENGTH}
        rows={2}
        className={`${fieldStyle} resize-none`}
      />
    </label>
  );

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
          <span className={labelStyle}>Your time</span>
          <input
            type="datetime-local"
            value={time}
            min={minTime}
            onChange={(event) => setTime(event.target.value)}
            className={fieldStyle}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelStyle}>Your place</span>
          <input
            type="text"
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            maxLength={PLACE_NAME_MAX_LENGTH}
            className={fieldStyle}
          />
          {/* The same two fields as in the author's form: a place and a
              hint to it, so "where exactly" is never lost on the way. */}
          <input
            type="text"
            value={placeNote}
            onChange={(event) => setPlaceNote(event.target.value)}
            placeholder="by the entrance — optional"
            maxLength={PLACE_NOTE_MAX_LENGTH}
            aria-label="A hint to the place"
            className={fieldStyle}
          />
        </label>

        <PayChips
          value={payChoice}
          onChange={(value) => {
            setPayChoice(value);
            setIsPayTouched(true);
          }}
        />

        {messageField}

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
      {messageField}

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
