"use client";

import { useRef, useState } from "react";
import { DateFormat, WhoPays } from "@/generated/prisma/enums";
import { useDraftList } from "@/hooks/useDraftList";
import {
  createPlaceDraft,
  createTimeDraft,
  OptionLists,
  toLocalInputValue,
  type PlaceDraft,
  type TimeDraft,
} from "@/components/OptionLists";
import { useBrowserValue } from "@/hooks/useBrowserValue";
import { createInvite } from "@/app/actions";
import {
  AUTHOR_NAME_MAX_LENGTH,
  DEFAULT_EXPIRY_DAYS,
  EXPIRY_OPTIONS,
  MESSAGE_MAX_LENGTH,
  type InviteErrors,
} from "@/lib/inviteRules";
import { DATE_FORMATS, FORMAT_ORDER } from "@/lib/dateFormats";
import { toUtcString } from "@/lib/time";

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

const WHO_PAYS_OPTIONS = [
  { value: WhoPays.MY_TREAT, label: "My treat" },
  { value: WhoPays.SPLIT, label: "Split it" },
  { value: WhoPays.DECIDE_LATER, label: "Decide later" },
];

const labelStyle =
  "mb-1.5 text-xs font-medium uppercase tracking-wide text-muted";
const fieldStyle =
  "rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none placeholder:text-quiet focus:border-accent";
const errorStyle = "mt-1 text-xs text-accent";

export function CreateInviteForm() {
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [format, setFormat] = useState<DateFormat>(DateFormat.COFFEE);
  const [whoPays, setWhoPays] = useState<WhoPays | null>(null);
  const [expiryDays, setExpiryDays] = useState(DEFAULT_EXPIRY_DAYS);

  // Shown only after mount: server and browser "today" can differ (hydration).
  const expiryDate = useBrowserValue<string | null>(() => {
    const date = new Date();
    date.setDate(date.getDate() + expiryDays);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, null);

  const minTime = useBrowserValue(
    () => toLocalInputValue(new Date().toISOString()),
    "",
  );

  const times = useDraftList<TimeDraft>(createTimeDraft);
  const places = useDraftList<PlaceDraft>(createPlaceDraft);

  const charsLeft = MESSAGE_MAX_LENGTH - message.length;

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<InviteErrors>({});
  // A ref blocks double clicks that state would miss before the re-render.
  const isSavingRef = useRef(false);

  // Keep form data out of the URL.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    setErrors({});

    let hasErrors = false;
    try {
      const result = await createInvite({
        authorName,
        message,
        format,
        whoPays,
        expiryDays,
        // UTC is made in the browser: only it knows the author's zone.
        times: times.items.map((time) => toUtcString(time.value)),
        places: places.items.map((place) => ({
          photoUrl: place.photoUrl,
          name: place.name,
          note: place.note,
        })),
      });

      // On success the server redirects, so a result means an error.
      if (result) {
        hasErrors = true;
        setErrors(result.errors);
      }
    } catch (error) {
      hasErrors = true;
      throw error;
    } finally {
      if (hasErrors) {
        isSavingRef.current = false;
        setIsSaving(false);
      }
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
          {FORMAT_ORDER.map((value) => {
            const isActive = value === format;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setFormat(value)}
                aria-pressed={isActive}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  isActive
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-surface text-muted"
                }`}
              >
                {DATE_FORMATS[value].label}
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

      <OptionLists times={times} places={places} minTime={minTime} />
      {errors.times && <p className={errorStyle}>{errors.times}</p>}
      {errors.places && <p className={errorStyle}>{errors.places}</p>}

      <fieldset className="flex flex-col border-0 p-0">
        <legend className={labelStyle}>
          How long is the invitation alive?
        </legend>
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
                onClick={() => setWhoPays(isActive ? null : option.value)}
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
    </form>
  );
}
