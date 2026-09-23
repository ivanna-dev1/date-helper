"use client";

import { useState } from "react";
import type { WhoPays } from "@/generated/prisma/enums";
import { answerTurn, type TurnKey } from "@/app/actions";
import { PayChips } from "@/components/PayChips";
import { InviteChoices, type Choice } from "@/components/InviteChoices";
import { useDraftList } from "@/hooks/useDraftList";
import {
  createPlaceDraft,
  createTimeDraft,
  OptionLists,
  toLocalInputValue,
  type PlaceDraft,
  type TimeDraft,
} from "@/components/OptionLists";
import { RESPONSE_MESSAGE_MAX_LENGTH } from "@/lib/inviteRules";
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

const labelStyle = "text-xs font-medium uppercase tracking-wide text-muted";
const fieldStyle =
  "rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none placeholder:text-quiet focus:border-accent";
const quietButton =
  "w-full rounded-xl border border-line py-3 text-sm font-medium text-muted disabled:opacity-60";

// Ready-made lines for the few words, like in the author's form.
// They fit any move, because one field is used for all three.
const MESSAGE_TEMPLATES = [
  "Sounds good!",
  "How about this instead?",
  "See you there!",
];

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
      <span className="flex flex-wrap gap-1.5">
        {MESSAGE_TEMPLATES.map((template) => (
          <button
            key={template}
            type="button"
            onClick={() => setMessage(template)}
            className="rounded-full border border-dashed border-line px-2.5 py-1.5 text-xs text-muted"
          >
            {template}
          </button>
        ))}
      </span>
      <span className="self-end text-xs text-quiet">
        {RESPONSE_MESSAGE_MAX_LENGTH - message.length} characters left
      </span>
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
        <OptionLists times={times} places={places} minTime={minTime} />

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
