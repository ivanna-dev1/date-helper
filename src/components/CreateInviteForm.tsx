"use client";

import { useEffect, useState } from "react";
import { DateFormat, WhoPays } from "@/generated/prisma/enums";
import { useDraftList } from "@/hooks/useDraftList";
import { createInvite } from "@/app/actions";
import {
  AUTHOR_NAME_MAX_LENGTH,
  DEFAULT_EXPIRY_DAYS,
  EXPIRY_OPTIONS,
  MAX_PLACE_OPTIONS,
  MAX_TIME_OPTIONS,
  MESSAGE_MAX_LENGTH,
  PLACE_NAME_MAX_LENGTH,
  PLACE_NOTE_MAX_LENGTH,
  type InviteErrors,
} from "@/lib/inviteRules";

// Labels for the date formats. The values come from the database enum,
// so a typo here would be a TypeScript error.
const FORMAT_OPTIONS = [
  { value: DateFormat.COFFEE, label: "Coffee" },
  { value: DateFormat.WALK, label: "Walk" },
  { value: DateFormat.DINNER, label: "Dinner" },
  { value: DateFormat.MOVIE, label: "Movie" },
  { value: DateFormat.SURPRISE, label: "Surprise" },
];

// Ready-made lines, so the author does not stare at an empty field.
// They depend on the format: a movie hint next to "Coffee" would feel wrong.
const MESSAGE_TEMPLATES: Record<DateFormat, string[]> = {
  [DateFormat.COFFEE]: [
    "Coffee this weekend?",
    "I know a nice coffee place",
    "Let's grab a coffee sometime?",
  ],
  [DateFormat.WALK]: [
    "Fancy a walk?",
    "The weather looks great — let's walk?",
    "A long walk and a longer talk?",
  ],
  [DateFormat.DINNER]: [
    "Dinner this week?",
    "I'd love to take you to dinner",
    "Hungry? Let's have dinner",
  ],
  [DateFormat.MOVIE]: [
    "Movie night?",
    "There is a film I want to see with you",
    "Popcorn and a movie?",
  ],
  [DateFormat.SURPRISE]: [
    "I have an idea — trust me?",
    "Something fun, I promise",
    "Say yes and I'll plan the rest",
  ],
};

// This field is optional and should stay quiet on the screen.
const WHO_PAYS_OPTIONS = [
  { value: WhoPays.MY_TREAT, label: "My treat" },
  { value: WhoPays.SPLIT, label: "Split it" },
  { value: WhoPays.DECIDE_LATER, label: "Decide later" },
];

type TimeDraft = {
  id: string;
  value: string; // "2026-09-12T18:00", the format of <input type="datetime-local">
};

type PlaceDraft = {
  id: string;
  name: string;
  note: string; // optional hint, for example "by the entrance"
};

function createTimeDraft(): TimeDraft {
  return { id: crypto.randomUUID(), value: "" };
}

function createPlaceDraft(): PlaceDraft {
  return { id: crypto.randomUUID(), name: "", note: "" };
}

// Shared styles. We keep them in one place so all fields look the same.
const labelStyle =
  "mb-1.5 text-xs font-medium uppercase tracking-wide text-muted";
const fieldStyle =
  "rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none placeholder:text-quiet focus:border-accent";
const addButtonStyle =
  "mt-2 rounded-xl border-2 border-dashed border-accent px-3 py-2.5 text-sm font-medium text-accent";
const removeButtonStyle = "px-2 text-xl text-accent";
const errorStyle = "mt-1 text-xs text-accent";

export function CreateInviteForm() {
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [format, setFormat] = useState<DateFormat>(DateFormat.COFFEE);
  // null means the author did not choose — that is a valid answer here.
  const [whoPays, setWhoPays] = useState<WhoPays | null>(null);
  const [expiryDays, setExpiryDays] = useState(DEFAULT_EXPIRY_DAYS);

  // The date is counted from "today", and today on the server can differ
  // from today in the browser (different time zones). If we rendered it
  // right away, the server HTML and the browser HTML would not match.
  // So we show the date only after the component is in the browser.
  const [expiryDate, setExpiryDate] = useState<string | null>(null);

  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + expiryDays);
    setExpiryDate(
      date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    );
  }, [expiryDays]);

  const times = useDraftList<TimeDraft>(createTimeDraft);
  const places = useDraftList<PlaceDraft>(createPlaceDraft);

  const charsLeft = MESSAGE_MAX_LENGTH - message.length;

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<InviteErrors>({});
  // Temporary: shows the result until we build the author page (step 3.12).
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  // Without preventDefault the browser does its old default: it reloads the
  // page and puts the form fields into the address bar. Private data must
  // never go into a URL.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrors({});

    try {
      const result = await createInvite({
        authorName,
        message,
        format,
        whoPays,
        expiryDays,
        times: times.items.map((time) => time.value),
        places: places.items.map((place) => ({
          name: place.name,
          note: place.note,
        })),
      });

      // TypeScript knows which fields exist only after we check `ok`.
      if (result.ok) {
        setCreatedToken(result.secretToken);
      } else {
        setErrors(result.errors);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col">
        <label htmlFor="authorName" className={labelStyle}>
          Your name
        </label>
        <input
          id="authorName"
          name="authorName"
          type="text"
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder="Olia"
          maxLength={AUTHOR_NAME_MAX_LENGTH}
          className={fieldStyle}
        />
        {errors.authorName && <p className={errorStyle}>{errors.authorName}</p>}
      </div>

      <fieldset className="flex flex-col border-0 p-0">
        <legend className={labelStyle}>What are you inviting to?</legend>
        <div className="flex flex-wrap gap-2">
          {FORMAT_OPTIONS.map((option) => {
            const isActive = option.value === format;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormat(option.value)}
                aria-pressed={isActive}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  isActive
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-surface text-muted"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col">
        <label htmlFor="message" className={labelStyle}>
          Message
        </label>
        <textarea
          id="message"
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Max, want to grab a coffee this weekend?"
          maxLength={MESSAGE_MAX_LENGTH}
          rows={3}
          className={`${fieldStyle} resize-none`}
        />

        <div className="mt-2 flex flex-wrap gap-1.5">
          {MESSAGE_TEMPLATES[format].map((template) => (
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
          {charsLeft} characters left
        </p>
        {errors.message && <p className={errorStyle}>{errors.message}</p>}
      </div>

      <fieldset className="flex flex-col border-0 p-0">
        <legend className={labelStyle}>When works for you?</legend>

        <div className="flex flex-col gap-2">
          {times.items.map((time, index) => (
            <div key={time.id} className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={time.value}
                onChange={(event) =>
                  times.update(time.id, { value: event.target.value })
                }
                aria-label={`Time option ${index + 1}`}
                className={`${fieldStyle} flex-1`}
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
        </div>

        {errors.times && <p className={errorStyle}>{errors.times}</p>}

        {times.items.length < MAX_TIME_OPTIONS && (
          <button type="button" onClick={times.add} className={addButtonStyle}>
            + Add another option
          </button>
        )}
      </fieldset>

      <fieldset className="flex flex-col border-0 p-0">
        <legend className={labelStyle}>Where?</legend>

        <div className="flex flex-col gap-3">
          {places.items.map((place, index) => (
            <div key={place.id} className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <input
                  type="text"
                  value={place.name}
                  onChange={(event) =>
                    places.update(place.id, { name: event.target.value })
                  }
                  placeholder="Bluebird Coffee"
                  maxLength={PLACE_NAME_MAX_LENGTH}
                  aria-label={`Place ${index + 1}`}
                  className={fieldStyle}
                />
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
        </div>

        {errors.places && <p className={errorStyle}>{errors.places}</p>}

        {places.items.length < MAX_PLACE_OPTIONS && (
          <button type="button" onClick={places.add} className={addButtonStyle}>
            + Add another option
          </button>
        )}
      </fieldset>

      <fieldset className="flex flex-col border-0 p-0">
        <legend className={labelStyle}>How long is the link alive?</legend>
        <div className="flex flex-wrap items-center gap-2">
          {EXPIRY_OPTIONS.map((days) => {
            const isActive = days === expiryDays;

            return (
              <button
                key={days}
                type="button"
                onClick={() => setExpiryDays(days)}
                aria-pressed={isActive}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  isActive
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-surface text-muted"
                }`}
              >
                {days} days
              </button>
            );
          })}
        </div>
        {expiryDate && (
          <p className="mt-1.5 text-xs text-quiet">Valid until {expiryDate}</p>
        )}
      </fieldset>

      {/* Quiet on purpose: small, grey, no caps. It should be easy to find
          but must not pull attention away from the main fields. */}
      <fieldset className="flex flex-col border-0 p-0">
        <legend className="mb-1.5 text-xs text-quiet">
          Who pays? — optional
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {WHO_PAYS_OPTIONS.map((option) => {
            const isActive = option.value === whoPays;

            return (
              <button
                key={option.value}
                type="button"
                // Clicking the active one clears it, so "no answer" stays reachable.
                onClick={() =>
                  setWhoPays(isActive ? null : option.value)
                }
                aria-pressed={isActive}
                className={`rounded-xl border px-2.5 py-1.5 text-xs ${
                  isActive
                    ? "border-line bg-surface text-muted"
                    : "border-line/60 text-quiet"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isSaving}
        className="mt-2 rounded-2xl bg-brand py-4 text-base font-semibold text-white disabled:opacity-60"
      >
        {isSaving ? "Saving…" : "Create invitation"}
      </button>

      {/* Temporary block. The author page replaces it in step 3.12. */}
      {createdToken && (
        <p className="rounded-xl border border-line bg-surface p-3 text-sm text-ink">
          Saved. Your link: <code className="text-accent">/manage/{createdToken}</code>
        </p>
      )}
    </form>
  );
}
