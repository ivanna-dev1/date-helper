"use client";

import { useState } from "react";
import type { WhoPays } from "@/generated/prisma/enums";
import { answerTurn, type TurnKey } from "@/app/actions";
import { PayChips } from "@/components/PayChips";
import { InviteChoices, type Choice } from "@/components/InviteChoices";
import { useDraftList } from "@/hooks/useDraftList";
import {
  MAX_PLACE_OPTIONS,
  MAX_TIME_OPTIONS,
  PLACE_NAME_MAX_LENGTH,
  PLACE_NOTE_MAX_LENGTH,
  RESPONSE_MESSAGE_MAX_LENGTH,
} from "@/lib/inviteRules";
import type { SentAnswer } from "@/lib/responseView";
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
  answer: SentAnswer; // the suggestion on the table
  currentWhoPays: WhoPays | null;
  otherName: string; // the other person, for the "Olia's treat" chip
};

type TimeDraft = {
  id: string;
  value: string; // "2026-09-12T18:00", the format of <input type="datetime-local">
};

type PlaceDraft = {
  id: string;
  name: string;
  note: string;
};

function createTimeDraft(): TimeDraft {
  return { id: crypto.randomUUID(), value: "" };
}

function createPlaceDraft(): PlaceDraft {
  return { id: crypto.randomUUID(), name: "", note: "" };
}

const labelStyle = "text-xs font-medium uppercase tracking-wide text-muted";
const fieldStyle =
  "rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none placeholder:text-quiet focus:border-accent";
const quietButton =
  "w-full rounded-xl border border-line py-3 text-sm font-medium text-muted disabled:opacity-60";
const addButtonStyle =
  "rounded-xl border-2 border-dashed border-accent px-3 py-2.5 text-sm font-medium text-accent";
const removeButtonStyle = "px-2 text-xl text-accent";

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

// Nothing to do: the choice cards below never show "your own" fields.
function ignore() {}

/**
 * The answer to the latest suggestion: accept, decline, or suggest
 * something else. The same component works for both people — which
 * person is acting comes from the link (turnKey), not from the screen.
 *
 * A suggestion may give a choice: several times and places, like the
 * author's first invitation. Then accepting means picking one of each.
 * A few words can go with any move.
 *
 * After any move the server refreshes the page, so the new state shows
 * by itself and this component does not keep the result.
 */
export function TurnDecision({
  turnKey,
  viewer,
  answer,
  currentWhoPays,
  otherName,
}: TurnDecisionProps) {
  const { choices } = answer;
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // What is picked from a suggestion with a choice. One option is picked
  // from the start: there is nothing to choose.
  const [timeChoice, setTimeChoice] = useState<Choice>(
    choices?.times.length === 1 ? choices.times[0].id : null,
  );
  const [placeChoice, setPlaceChoice] = useState<Choice>(
    choices?.places.length === 1 ? choices.places[0].id : null,
  );

  const times = useDraftList<TimeDraft>(createTimeDraft);
  const places = useDraftList<PlaceDraft>(createPlaceDraft);
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
        // The browser knows the zone, so the times turn into UTC here.
        proposedTimes: isCounter
          ? times.items
              .filter((time) => time.value !== "")
              .map((time) => toUtcString(time.value))
          : undefined,
        proposedPlaces: isCounter
          ? places.items.map((place) => ({
              name: place.name,
              note: place.note,
            }))
          : undefined,
        whoPays:
          isCounter && isPayTouched ? toWhoPays(payChoice, viewer) : undefined,
        timeId: typeof timeChoice === "number" ? timeChoice : null,
        placeId: typeof placeChoice === "number" ? placeChoice : null,
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
    const currentTimes = choices
      ? choices.times.map((time) => time.startsAt)
      : answer.time
        ? [answer.time]
        : [];
    const currentPlaces = choices
      ? choices.places
      : answer.place
        ? [{ name: answer.place, note: answer.placeNote }]
        : [];
    times.replace(
      currentTimes.map((time) => ({
        id: crypto.randomUUID(),
        value: toLocalInputValue(time),
      })),
    );
    places.replace(
      currentPlaces.map((place) => ({
        id: crypto.randomUUID(),
        name: place.name,
        note: place.note ?? "",
      })),
    );
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
        className="flex w-full flex-col gap-5 text-left"
      >
        {/* The same lists as in the author's form: one option, or a few
            for the other person to pick from. */}
        <fieldset className="flex flex-col gap-2">
          <legend className={`${labelStyle} mb-1.5`}>
            When works for you?
          </legend>
          {times.items.map((time, index) => (
            <div key={time.id} className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={time.value}
                min={minTime}
                onChange={(event) =>
                  times.update(time.id, { value: event.target.value })
                }
                aria-label={`Time option ${index + 1}`}
                className={`${fieldStyle} min-w-0 flex-1`}
              />
              {times.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => times.remove(time.id)}
                  aria-label={`Remove time option ${index + 1}`}
                  className={removeButtonStyle}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {times.items.length < MAX_TIME_OPTIONS && (
            <button
              type="button"
              onClick={times.add}
              className={addButtonStyle}
            >
              + Add another option
            </button>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className={`${labelStyle} mb-1.5`}>Where?</legend>
          {places.items.map((place, index) => (
            <div key={place.id} className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <input
                  type="text"
                  value={place.name}
                  onChange={(event) =>
                    places.update(place.id, { name: event.target.value })
                  }
                  maxLength={PLACE_NAME_MAX_LENGTH}
                  aria-label={`Place ${index + 1}`}
                  className={fieldStyle}
                />
                {/* The hint to the place, so "where exactly" is never lost
                    on the way. */}
                <input
                  type="text"
                  value={place.note}
                  onChange={(event) =>
                    places.update(place.id, { note: event.target.value })
                  }
                  placeholder="by the entrance — optional"
                  maxLength={PLACE_NOTE_MAX_LENGTH}
                  aria-label={`Note for place ${index + 1}`}
                  className={`${fieldStyle} py-2 text-sm`}
                />
              </div>
              {places.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => places.remove(place.id)}
                  aria-label={`Remove place ${index + 1}`}
                  className={removeButtonStyle}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {places.items.length < MAX_PLACE_OPTIONS && (
            <button
              type="button"
              onClick={places.add}
              className={addButtonStyle}
            >
              + Add another option
            </button>
          )}
        </fieldset>

        <PayChips
          value={payChoice}
          offeredBy={
            toPayChoice(currentWhoPays, viewer) === "other" ? otherName : null
          }
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
      {/* A suggestion with a choice: pick one time and one place,
          the same cards as on the first invitation. */}
      {choices && (
        <div className="mb-4 text-left">
          <InviteChoices
            times={choices.times}
            places={choices.places}
            timeChoice={timeChoice}
            placeChoice={placeChoice}
            onTimeChoice={setTimeChoice}
            onPlaceChoice={setPlaceChoice}
            allowOther={false}
            otherTime=""
            otherPlace=""
            otherPlaceNote=""
            onOtherTime={ignore}
            onOtherPlace={ignore}
            onOtherPlaceNote={ignore}
          />
        </div>
      )}

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
