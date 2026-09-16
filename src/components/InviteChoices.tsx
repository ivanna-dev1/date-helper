"use client";

import { LocalDateTime } from "@/components/LocalDateTime";
import { PLACE_NAME_MAX_LENGTH } from "@/lib/inviteRules";

// Data that comes from the server page. Only plain values:
// a Date object is sent as an ISO string, because props from the server
// must be simple data the browser can rebuild.
export type TimeOptionView = { id: number; startsAt: string };
export type PlaceOptionView = { id: number; name: string; note: string | null };

// What is picked in one group: an option id, "other" for the person's own
// suggestion, or null when nothing is picked yet.
export type Choice = number | "other" | null;

// This component has no state of its own. The parent form keeps the state
// and passes it down, because the form needs these values to send the answer.
type InviteChoicesProps = {
  times: TimeOptionView[];
  places: PlaceOptionView[];
  timeChoice: Choice;
  placeChoice: Choice;
  onTimeChoice: (choice: Choice) => void;
  onPlaceChoice: (choice: Choice) => void;
  // true when the person wants to suggest something else
  allowOther: boolean;
  otherTime: string; // "2026-09-12T18:00", the format of <input type="datetime-local">
  otherPlace: string;
  onOtherTime: (value: string) => void;
  onOtherPlace: (value: string) => void;
  // Messages from the server, shown under each group.
  timeError?: string;
  placeError?: string;
};

const legendStyle =
  "mb-2 text-xs font-medium uppercase tracking-wide text-muted";

// Each option is a real radio input, hidden from the eye, plus a label that
// looks like a card. The hidden input still gives keyboard arrows and tells
// screen readers "option 2 of 3, selected".
// `peer` marks the input; `peer-checked:` styles the card next to it
// when that input is checked.
const cardStyle =
  "block cursor-pointer rounded-xl border-2 border-line bg-surface px-3.5 py-3 text-base text-ink " +
  "peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white " +
  "peer-focus-visible:ring-2 peer-focus-visible:ring-accent";

// The card for "my own suggestion" has a dashed border, so it looks
// different from the real options.
const otherCardStyle = `${cardStyle} border-dashed text-accent`;

const fieldStyle =
  "mt-2 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none placeholder:text-quiet focus:border-accent";

const errorStyle = "mt-1.5 text-xs text-accent";

export function InviteChoices({
  times,
  places,
  timeChoice,
  placeChoice,
  onTimeChoice,
  onPlaceChoice,
  allowOther,
  otherTime,
  otherPlace,
  onOtherTime,
  onOtherPlace,
  timeError,
  placeError,
}: InviteChoicesProps) {
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="border-0 p-0">
        <legend className={legendStyle}>Pick a time</legend>
        <div className="flex flex-col gap-2">
          {times.map((time) => (
            <div key={time.id}>
              <input
                type="radio"
                id={`time-${time.id}`}
                name="time"
                checked={timeChoice === time.id}
                onChange={() => onTimeChoice(time.id)}
                className="peer sr-only"
              />
              <label htmlFor={`time-${time.id}`} className={cardStyle}>
                <LocalDateTime value={time.startsAt} />
              </label>
            </div>
          ))}

          {allowOther && (
            <div>
              <input
                type="radio"
                id="time-other"
                name="time"
                checked={timeChoice === "other"}
                onChange={() => onTimeChoice("other")}
                className="peer sr-only"
              />
              <label htmlFor="time-other" className={otherCardStyle}>
                + Another time
              </label>
              {timeChoice === "other" && (
                <input
                  type="datetime-local"
                  value={otherTime}
                  onChange={(event) => onOtherTime(event.target.value)}
                  aria-label="Your time"
                  className={fieldStyle}
                />
              )}
            </div>
          )}
        </div>
        {timeError && <p className={errorStyle}>{timeError}</p>}
      </fieldset>

      <fieldset className="border-0 p-0">
        <legend className={legendStyle}>Pick a place</legend>
        <div className="flex flex-col gap-2">
          {places.map((place) => (
            <div key={place.id}>
              <input
                type="radio"
                id={`place-${place.id}`}
                name="place"
                checked={placeChoice === place.id}
                onChange={() => onPlaceChoice(place.id)}
                className="peer sr-only"
              />
              <label htmlFor={`place-${place.id}`} className={cardStyle}>
                <span className="block">{place.name}</span>
                {/* opacity keeps the note a bit lighter than the name,
                    both on the light card and on the pink selected card */}
                {place.note && (
                  <span className="mt-0.5 block text-xs opacity-75">
                    {place.note}
                  </span>
                )}
              </label>
            </div>
          ))}

          {allowOther && (
            <div>
              <input
                type="radio"
                id="place-other"
                name="place"
                checked={placeChoice === "other"}
                onChange={() => onPlaceChoice("other")}
                className="peer sr-only"
              />
              <label htmlFor="place-other" className={otherCardStyle}>
                + Another place
              </label>
              {placeChoice === "other" && (
                <input
                  type="text"
                  value={otherPlace}
                  onChange={(event) => onOtherPlace(event.target.value)}
                  placeholder="Where would you like to go?"
                  maxLength={PLACE_NAME_MAX_LENGTH}
                  aria-label="Your place"
                  className={fieldStyle}
                />
              )}
            </div>
          )}
        </div>
        {placeError && <p className={errorStyle}>{placeError}</p>}
      </fieldset>
    </div>
  );
}
