"use client";

import { useState } from "react";
import { DateFormat } from "@/generated/prisma/enums";
import { useDraftList } from "@/hooks/useDraftList";

// The message is shown on the link preview card in a messenger.
// That card is small, so a long text would be cut off.
const MESSAGE_MAX_LENGTH = 120;

const MAX_TIME_OPTIONS = 5;
const MAX_PLACE_OPTIONS = 5;

// Labels for the date formats. The values come from the database enum,
// so a typo here would be a TypeScript error.
const FORMAT_OPTIONS = [
  { value: DateFormat.COFFEE, label: "Coffee" },
  { value: DateFormat.WALK, label: "Walk" },
  { value: DateFormat.DINNER, label: "Dinner" },
  { value: DateFormat.MOVIE, label: "Movie" },
  { value: DateFormat.SURPRISE, label: "Surprise" },
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

export function CreateInviteForm() {
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [format, setFormat] = useState<DateFormat>(DateFormat.COFFEE);

  const times = useDraftList<TimeDraft>(createTimeDraft);
  const places = useDraftList<PlaceDraft>(createPlaceDraft);

  const charsLeft = MESSAGE_MAX_LENGTH - message.length;

  // Without this the browser does its old default: it reloads the page and
  // puts the form fields into the address bar. Private data must never go
  // into a URL. Real sending comes later, with a Server Action.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
          maxLength={50}
          className={fieldStyle}
        />
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
        <p className="mt-1 self-end text-xs text-quiet">
          {charsLeft} characters left
        </p>
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
                  maxLength={60}
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
                  maxLength={60}
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

        {places.items.length < MAX_PLACE_OPTIONS && (
          <button type="button" onClick={places.add} className={addButtonStyle}>
            + Add another option
          </button>
        )}
      </fieldset>

      <button
        type="submit"
        className="mt-2 rounded-2xl bg-brand py-4 text-base font-semibold text-white"
      >
        Create invitation
      </button>
    </form>
  );
}
