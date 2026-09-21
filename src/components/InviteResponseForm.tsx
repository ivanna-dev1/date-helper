"use client";

import { useState } from "react";
import {
  InviteStatus,
  ResponseType,
  type WhoPays,
} from "@/generated/prisma/enums";
import { submitResponse } from "@/app/actions";
import {
  InviteChoices,
  type Choice,
  type PlaceOptionView,
  type TimeOptionView,
} from "@/components/InviteChoices";
import {
  AUTHOR_NAME_MAX_LENGTH,
  RESPONSE_MESSAGE_MAX_LENGTH,
} from "@/lib/inviteRules";
import type { ResponseErrors } from "@/lib/responseRules";
import { toUtcString } from "@/lib/time";
import { ResponseSummary } from "@/components/ResponseSummary";
import { getOutcome, type SentAnswer } from "@/lib/responseView";
import { PayChips } from "@/components/PayChips";
import {
  getWhoPaysText,
  toPayChoice,
  toWhoPays,
  type PayChoice,
} from "@/lib/whoPays";

// Three ways to answer. The mode decides what the form shows.
// "yes"     — pick a time and a place from the author's options
// "counter" — the same, but you may suggest your own time or place
// "no"      — the options are hidden, only your name and a few words
type Mode = "yes" | "counter" | "no";

// Which kind of answer each mode sends to the server.
const TYPE_BY_MODE: Record<Mode, ResponseType> = {
  yes: ResponseType.YES,
  counter: ResponseType.COUNTER,
  no: ResponseType.NO,
};

type InviteResponseFormProps = {
  token: string;
  authorName: string; // for the text on the screen after sending
  whoPays: WhoPays | null;
  friendToken: string;
  times: TimeOptionView[];
  places: PlaceOptionView[];
};

const labelStyle =
  "mb-1.5 text-xs font-medium uppercase tracking-wide text-muted";
const fieldStyle =
  "rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none placeholder:text-quiet focus:border-accent";
const errorStyle = "mt-1 text-xs text-accent";

// The text on the main button changes with the mode.
const SUBMIT_LABELS: Record<Mode, string> = {
  yes: "Works for me!",
  counter: "Send my suggestion",
  no: "Send my answer",
};

const MESSAGE_PLACEHOLDERS: Record<Mode, string> = {
  yes: "Sounds great, see you!",
  counter: "Those don't work for me, but how about this?",
  no: "Thank you for asking, but I can't this time",
};

export function InviteResponseForm({
  token,
  authorName,
  whoPays,
  friendToken,
  times,
  places,
}: InviteResponseFormProps) {
  const [mode, setMode] = useState<Mode>("yes");
  // The invited person has no name here yet, and only the author could
  // have chosen, so the guest's name is never needed.
  const whoPaysText = getWhoPaysText(whoPays, authorName, "", "guest");

  // When there is only one option, there is nothing to choose: it is
  // picked from the start, so "Works for me!" is the only click needed.
  const onlyTime: Choice = times.length === 1 ? times[0].id : null;
  const onlyPlace: Choice = places.length === 1 ? places[0].id : null;

  // The state lives here, not in InviteChoices: this form will send it.
  const [timeChoice, setTimeChoice] = useState<Choice>(onlyTime);
  const [placeChoice, setPlaceChoice] = useState<Choice>(onlyPlace);
  const [otherTime, setOtherTime] = useState("");
  const [otherPlace, setOtherPlace] = useState("");
  const [otherPlaceNote, setOtherPlaceNote] = useState("");
  // Who pays, from this person's side. Starts with the author's choice,
  // so "Olia is treating" shows as the picked "Olia's treat" chip.
  const [payChoice, setPayChoice] = useState<PayChoice>(
    toPayChoice(whoPays, "guest"),
  );
  // Sent only after a click, so the author's "My treat" is not wiped.
  const [isPayTouched, setIsPayTouched] = useState(false);

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const [isSending, setIsSending] = useState(false);
  const [errors, setErrors] = useState<ResponseErrors>({});
  // What was sent. While it is null, the form is shown.
  const [sentAnswer, setSentAnswer] = useState<SentAnswer | null>(null);
  // After a suggestion: the author's link to answer it, sent by this person.
  const [turnToken, setTurnToken] = useState<string | null>(null);
  // Who pays after this answer (a suggestion may have changed it).
  const [sentWhoPays, setSentWhoPays] = useState<WhoPays | null>(whoPays);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    // Old messages are about the old mode, so they would only confuse.
    setErrors({});
    // "Another time" and "Another place" exist only in the counter mode.
    // If one of them was picked, clear it so no hidden choice stays behind.
    if (nextMode !== "counter") {
      if (timeChoice === "other") setTimeChoice(onlyTime);
      if (placeChoice === "other") setPlaceChoice(onlyPlace);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);
    setErrors({});

    const isNo = mode === "no";
    const isCounter = mode === "counter";
    const type = TYPE_BY_MODE[mode];

    // For "no" nothing is picked, even if something was picked before.
    const timeId = !isNo && typeof timeChoice === "number" ? timeChoice : null;
    const placeId =
      !isNo && typeof placeChoice === "number" ? placeChoice : null;
    // Own time goes as UTC, turned in the browser (see src/lib/time.ts).
    const proposedTime =
      isCounter && timeChoice === "other" && otherTime !== ""
        ? toUtcString(otherTime)
        : null;
    const proposedPlace =
      isCounter && placeChoice === "other" ? otherPlace.trim() || null : null;
    const proposedPlaceNote = proposedPlace
      ? otherPlaceNote.trim() || null
      : null;
    // Only a suggestion may change who pays; otherwise the author's stays.
    const newWhoPays =
      isCounter && isPayTouched ? toWhoPays(payChoice, "guest") : whoPays;

    try {
      const result = await submitResponse({
        token,
        type,
        respondentName: name,
        message,
        timeId,
        placeId,
        proposedTime,
        proposedPlace,
        proposedPlaceNote,
        whoPays: isCounter && isPayTouched ? newWhoPays : undefined,
      });

      if (result.ok) {
        setTurnToken(result.turnToken);
        setSentWhoPays(newWhoPays);
        // The same values the server got, in a form the screen can show.
        // An own value wins over a picked option, like on the server.
        setSentAnswer({
          // Right after answering, the author has not decided anything yet.
          outcome: getOutcome(type, InviteStatus.PENDING),
          proposedBy: "guest",
          time:
            proposedTime ??
            times.find((time) => time.id === timeId)?.startsAt ??
            null,
          place:
            proposedPlace ??
            places.find((place) => place.id === placeId)?.name ??
            null,
          placeNote: proposedPlace
            ? proposedPlaceNote
            : (places.find((place) => place.id === placeId)?.note ?? null),
          isOwnTime: proposedTime !== null,
          isOwnPlace: proposedPlace !== null,
          choices: null,
        });
      } else {
        setErrors(result.errors);
      }
    } finally {
      setIsSending(false);
    }
  }

  if (sentAnswer) {
    return (
      <ResponseSummary
        answer={sentAnswer}
        authorName={authorName}
        whoPays={sentWhoPays}
        friendToken={friendToken}
        token={token}
        guestName={name.trim()}
        lastWords={
          message.trim() ? { by: "guest", text: message.trim() } : null
        }
        turnToken={turnToken}
        isJustSent
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* When the answer is "no", there is nothing to pick. */}
      {mode !== "no" && (
        <InviteChoices
          times={times}
          places={places}
          timeChoice={timeChoice}
          placeChoice={placeChoice}
          onTimeChoice={setTimeChoice}
          onPlaceChoice={setPlaceChoice}
          allowOther={mode === "counter"}
          otherTime={otherTime}
          otherPlace={otherPlace}
          otherPlaceNote={otherPlaceNote}
          onOtherPlaceNote={setOtherPlaceNote}
          onOtherTime={setOtherTime}
          onOtherPlace={setOtherPlace}
          timeError={errors.time}
          placeError={errors.place}
        />
      )}

      {mode === "counter" && (
        <p className="-mt-2 text-sm text-muted">
          Pick an option or add your own — for the time, the place, or both.
        </p>
      )}

      {/* The author's choice about the bill, as on the plan later.
          In the suggestion mode the chips show it instead. */}
      {mode === "yes" && whoPaysText && (
        <p className="-mt-2 text-sm italic text-muted">{whoPaysText}</p>
      )}

      {/* A suggestion may also say who pays: "My treat" — "no, my treat". */}
      {mode === "counter" && (
        <PayChips
          value={payChoice}
          offeredBy={
            toPayChoice(whoPays, "guest") === "other" ? authorName : null
          }
          onChange={(value) => {
            setPayChoice(value);
            setIsPayTouched(true);
          }}
        />
      )}

      <div className="flex flex-col">
        <label htmlFor="respondentName" className={labelStyle}>
          Your name
        </label>
        <input
          id="respondentName"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Max"
          // The same limit as the author's name.
          maxLength={AUTHOR_NAME_MAX_LENGTH}
          className={fieldStyle}
        />
        {errors.respondentName && (
          <p className={errorStyle}>{errors.respondentName}</p>
        )}
      </div>

      <div className="flex flex-col">
        <label htmlFor="responseMessage" className={labelStyle}>
          A few words back — optional
        </label>
        <textarea
          id="responseMessage"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={MESSAGE_PLACEHOLDERS[mode]}
          maxLength={RESPONSE_MESSAGE_MAX_LENGTH}
          rows={3}
          className={`${fieldStyle} resize-none`}
        />
        {errors.message && <p className={errorStyle}>{errors.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        {errors.form && (
          <p className="text-center text-sm text-accent">{errors.form}</p>
        )}

        <button
          type="submit"
          disabled={isSending}
          className="rounded-2xl bg-brand py-4 text-base font-semibold text-white disabled:opacity-60"
        >
          {isSending ? "Sending…" : SUBMIT_LABELS[mode]}
        </button>

        {/* The buttons below the main one follow the mockup: the calm
            "suggest" button, then the quietest "can't" button. */}
        {mode === "yes" ? (
          <>
            <button
              type="button"
              onClick={() => changeMode("counter")}
              className="rounded-xl border border-line py-3 text-sm font-medium text-muted"
            >
              Suggest another option
            </button>
            <button
              type="button"
              onClick={() => changeMode("no")}
              className="py-2 text-sm text-quiet"
            >
              Sorry, I can&apos;t
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => changeMode("yes")}
            className="py-2 text-sm text-quiet"
          >
            ← Back
          </button>
        )}
      </div>
    </form>
  );
}
