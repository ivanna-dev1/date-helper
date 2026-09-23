"use client";

import {
  MAX_PLACE_OPTIONS,
  MAX_TIME_OPTIONS,
  PLACE_NAME_MAX_LENGTH,
  PLACE_NOTE_MAX_LENGTH,
} from "@/lib/inviteRules";
import type { useDraftList } from "@/hooks/useDraftList";

// One row of each list, as the forms keep them.
export type TimeDraft = {
  id: string;
  value: string; // "2026-09-12T18:00", the format of <input type="datetime-local">
};

export type PlaceDraft = {
  id: string;
  name: string;
  note: string; // a hint, for example "by the entrance"
};

export function createTimeDraft(): TimeDraft {
  return { id: crypto.randomUUID(), value: "" };
}

export function createPlaceDraft(): PlaceDraft {
  return { id: crypto.randomUUID(), name: "", note: "" };
}

type OptionListsProps = {
  times: ReturnType<typeof useDraftList<TimeDraft>>;
  places: ReturnType<typeof useDraftList<PlaceDraft>>;
  // The earliest time the picker allows: past days and hours are greyed out.
  minTime: string;
};

const labelStyle = "text-xs font-medium uppercase tracking-wide text-muted";
const hintStyle = "text-xs text-quiet";
const fieldStyle =
  "rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none placeholder:text-quiet focus:border-accent";
const addButtonStyle =
  "rounded-xl border-2 border-dashed border-accent px-3 py-2.5 text-sm font-medium text-accent";
const removeButtonStyle = "px-2 text-xl text-accent";

/**
 * "When?" and "Where?" as lists you can add to and remove from — the same
 * on every screen where someone suggests something: the author's first
 * invitation, the invited person's first answer, and every move after that.
 */
export function OptionLists({ times, places, minTime }: OptionListsProps) {
  return (
    <>
      <fieldset className="flex flex-col gap-2">
        <legend className={`${labelStyle} mb-1.5`}>When?</legend>
        <p className={`-mt-1 ${hintStyle}`}>
          One time or a few — they pick one.
        </p>
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
          <button type="button" onClick={times.add} className={addButtonStyle}>
            + Add another option
          </button>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className={`${labelStyle} mb-1.5`}>Where?</legend>
        <p className={`-mt-1 ${hintStyle}`}>
          One place or a few, with a note where exactly to meet.
        </p>
        {places.items.map((place, index) => (
          <div key={place.id} className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <input
                type="text"
                value={place.name}
                onChange={(event) =>
                  places.update(place.id, { name: event.target.value })
                }
                placeholder="Where would you like to go?"
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
        {places.items.length < MAX_PLACE_OPTIONS && (
          <button type="button" onClick={places.add} className={addButtonStyle}>
            + Add another option
          </button>
        )}
      </fieldset>
    </>
  );
}

// "2026-12-20T16:00:00.000Z" → "2026-12-20T18:00" in the reader's own zone.
// Runs only in the browser, which is the only place that knows the zone.
export function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
