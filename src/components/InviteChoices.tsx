"use client";

import { useState } from "react";
import { LocalDateTime } from "@/components/LocalDateTime";

// Data that comes from the server page. Only plain values:
// a Date object is sent as an ISO string, because props from the server
// must be simple data the browser can rebuild.
export type TimeOptionView = { id: number; startsAt: string };
export type PlaceOptionView = { id: number; name: string; note: string | null };

type InviteChoicesProps = {
  times: TimeOptionView[];
  places: PlaceOptionView[];
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

export function InviteChoices({ times, places }: InviteChoicesProps) {
  const [timeId, setTimeId] = useState<number | null>(null);
  const [placeId, setPlaceId] = useState<number | null>(null);

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
                checked={timeId === time.id}
                onChange={() => setTimeId(time.id)}
                className="peer sr-only"
              />
              <label htmlFor={`time-${time.id}`} className={cardStyle}>
                <LocalDateTime value={time.startsAt} />
              </label>
            </div>
          ))}
        </div>
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
                checked={placeId === place.id}
                onChange={() => setPlaceId(place.id)}
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
        </div>
      </fieldset>
    </div>
  );
}
