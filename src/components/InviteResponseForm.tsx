"use client";

import { useState } from "react";
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

// Three ways to answer. The mode decides what the form shows.
// "yes"     — pick a time and a place from the author's options
// "counter" — the same, but you may suggest your own time or place
// "no"      — the options are hidden, only your name and a few words
type Mode = "yes" | "counter" | "no";

type InviteResponseFormProps = {
  times: TimeOptionView[];
  places: PlaceOptionView[];
};

const labelStyle =
  "mb-1.5 text-xs font-medium uppercase tracking-wide text-muted";
const fieldStyle =
  "rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none placeholder:text-quiet focus:border-accent";

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

export function InviteResponseForm({ times, places }: InviteResponseFormProps) {
  const [mode, setMode] = useState<Mode>("yes");

  // The state lives here, not in InviteChoices: this form will send it.
  const [timeChoice, setTimeChoice] = useState<Choice>(null);
  const [placeChoice, setPlaceChoice] = useState<Choice>(null);
  const [otherTime, setOtherTime] = useState("");
  const [otherPlace, setOtherPlace] = useState("");

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  function backToYes() {
    setMode("yes");
    // "Another time" and "Another place" exist only in the counter mode.
    // If one of them was picked, clear it so no hidden choice stays behind.
    if (timeChoice === "other") setTimeChoice(null);
    if (placeChoice === "other") setPlaceChoice(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Saving the answer comes in step 5.5, with a Server Action.
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
          onOtherTime={setOtherTime}
          onOtherPlace={setOtherPlace}
        />
      )}

      {mode === "counter" && (
        <p className="-mt-2 text-sm text-muted">
          Pick an option or add your own — for the time, the place, or both.
        </p>
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
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className="rounded-2xl bg-brand py-4 text-base font-semibold text-white"
        >
          {SUBMIT_LABELS[mode]}
        </button>

        {/* The buttons below the main one follow the mockup: the calm
            "suggest" button, then the quietest "can't" button. */}
        {mode === "yes" ? (
          <>
            <button
              type="button"
              onClick={() => setMode("counter")}
              className="rounded-xl border border-line py-3 text-sm font-medium text-muted"
            >
              Suggest another option
            </button>
            <button
              type="button"
              onClick={() => setMode("no")}
              className="py-2 text-sm text-quiet"
            >
              Sorry, I can't
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={backToYes}
            className="py-2 text-sm text-quiet"
          >
            ← Back
          </button>
        )}
      </div>
    </form>
  );
}
