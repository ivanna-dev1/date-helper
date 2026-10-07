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
import { useDraftList } from "@/hooks/useDraftList";
import {
  createPlaceDraft,
  createTimeDraft,
  OptionLists,
  toLocalInputValue,
  type PlaceDraft,
  type TimeDraft,
} from "@/components/OptionLists";
import {
  getWhoPaysText,
  toPayChoice,
  toWhoPays,
  type PayChoice,
} from "@/lib/whoPays";

type Mode = "yes" | "counter" | "no";

const TYPE_BY_MODE: Record<Mode, ResponseType> = {
  yes: ResponseType.YES,
  counter: ResponseType.COUNTER,
  no: ResponseType.NO,
};

type InviteResponseFormProps = {
  token: string;
  authorName: string;
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

const SUBMIT_LABELS: Record<Mode, string> = {
  yes: "Accept",
  counter: "Send my suggestion",
  no: "Send my answer",
};

const MESSAGE_TEMPLATES: Record<Mode, string[]> = {
  yes: ["Sounds great, see you!", "Perfect, I'll be there", "Can't wait!"],
  counter: [
    "Those don't work for me, but how about this?",
    "I'd love to — another time?",
    "What about this instead?",
  ],
  no: [
    "Thank you for asking, but I can't this time",
    "Sorry, I'm busy that day",
    "Not this time — but thank you",
  ],
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
  const whoPaysText = getWhoPaysText(whoPays, authorName, "", "guest");

  const onlyTime: Choice = times.length === 1 ? times[0].id : null;
  const onlyPlace: Choice = places.length === 1 ? places[0].id : null;

  const [timeChoice, setTimeChoice] = useState<Choice>(onlyTime);
  const [placeChoice, setPlaceChoice] = useState<Choice>(onlyPlace);
  const ownTimes = useDraftList<TimeDraft>(createTimeDraft);
  const ownPlaces = useDraftList<PlaceDraft>(createPlaceDraft);
  const [minTime, setMinTime] = useState("");
  const [payChoice, setPayChoice] = useState<PayChoice>(
    toPayChoice(whoPays, "guest"),
  );
  // Sent only after a click, so the author's "My treat" is not wiped.
  const [isPayTouched, setIsPayTouched] = useState(false);

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const [isSending, setIsSending] = useState(false);
  const [errors, setErrors] = useState<ResponseErrors>({});
  const [sentAnswer, setSentAnswer] = useState<SentAnswer | null>(null);
  const [turnToken, setTurnToken] = useState<string | null>(null);
  const [sentWhoPays, setSentWhoPays] = useState<WhoPays | null>(whoPays);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setErrors({});
    if (nextMode === "counter") {
      ownTimes.replace(
        times.map((time) => ({
          id: crypto.randomUUID(),
          value: toLocalInputValue(time.startsAt),
        })),
      );
      ownPlaces.replace(
        places.map((place) => ({
          id: crypto.randomUUID(),
          name: place.name,
          note: place.note ?? "",
          photoUrl: place.photoUrl,
        })),
      );
      setMinTime(toLocalInputValue(new Date().toISOString()));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);
    setErrors({});

    const isNo = mode === "no";
    const isCounter = mode === "counter";
    const type = TYPE_BY_MODE[mode];

    const timeId = !isNo && typeof timeChoice === "number" ? timeChoice : null;
    const placeId =
      !isNo && typeof placeChoice === "number" ? placeChoice : null;
    const proposedTimes = isCounter
      ? ownTimes.items
          .filter((time) => time.value !== "")
          .map((time) => toUtcString(time.value))
      : [];
    const proposedPlaces = isCounter
      ? ownPlaces.items.map((place) => ({
          name: place.name,
          note: place.note,
          photoUrl: place.photoUrl,
        }))
      : [];
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
        proposedTimes,
        proposedPlaces,
        whoPays: isCounter && isPayTouched ? newWhoPays : undefined,
      });

      if (result.ok) {
        setTurnToken(result.turnToken);
        setSentWhoPays(newWhoPays);
        const saved = result.choices;
        const hasChoice =
          saved !== null && (saved.times.length > 1 || saved.places.length > 1);
        const onlySavedPlace = saved && !hasChoice ? saved.places[0] : null;
        setSentAnswer({
          outcome: getOutcome(type, InviteStatus.PENDING),
          proposedBy: "guest",
          time: saved
            ? !hasChoice
              ? saved.times[0].startsAt
              : null
            : (times.find((time) => time.id === timeId)?.startsAt ?? null),
          place: saved
            ? (onlySavedPlace?.name ?? null)
            : (places.find((place) => place.id === placeId)?.name ?? null),
          placeNote: saved
            ? (onlySavedPlace?.note ?? null)
            : (places.find((place) => place.id === placeId)?.note ?? null),
          placePhoto: saved
            ? (onlySavedPlace?.photoUrl ?? null)
            : (places.find((place) => place.id === placeId)?.photoUrl ?? null),
          isOwnTime: false,
          isOwnPlace: false,
          choices: hasChoice ? saved : null,
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
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {mode === "counter" && (
        <>
          <OptionLists times={ownTimes} places={ownPlaces} minTime={minTime} />
          {errors.time && <p className={errorStyle}>{errors.time}</p>}
          {errors.place && <p className={errorStyle}>{errors.place}</p>}
        </>
      )}

      {mode === "yes" && (
        <InviteChoices
          times={times}
          places={places}
          timeChoice={timeChoice}
          placeChoice={placeChoice}
          onTimeChoice={setTimeChoice}
          onPlaceChoice={setPlaceChoice}
          allowOther={false}
          otherTime=""
          otherPlace=""
          otherPlaceNote=""
          onOtherPlaceNote={() => {}}
          onOtherTime={() => {}}
          onOtherPlace={() => {}}
          timeError={errors.time}
          placeError={errors.place}
        />
      )}

      {mode === "yes" && whoPaysText && (
        <p className="-mt-2 text-sm italic text-muted">{whoPaysText}</p>
      )}

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
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MESSAGE_TEMPLATES[mode].map((template) => (
            <button
              key={template}
              type="button"
              onClick={() => setMessage(template)}
              className="rounded-full border border-dashed border-line px-2.5 py-1.5 text-xs text-muted"
            >
              {template}
            </button>
          ))}
        </div>

        <p className="mt-1.5 self-end text-xs text-quiet">
          {RESPONSE_MESSAGE_MAX_LENGTH - message.length} characters left
        </p>
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
