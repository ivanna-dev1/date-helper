"use client";

import Image from "next/image";
import { LocalDateTime } from "@/components/LocalDateTime";
import { MapsLink } from "@/components/MapsLink";
import {
  PLACE_NAME_MAX_LENGTH,
  PLACE_NOTE_MAX_LENGTH,
} from "@/lib/inviteRules";

export type TimeOptionView = { id: number; startsAt: string };
export type PlaceOptionView = {
  id: number;
  name: string;
  note: string | null;
  photoUrl: string | null;
};

export type Choice = number | "other" | null;

type InviteChoicesProps = {
  times: TimeOptionView[];
  places: PlaceOptionView[];
  timeChoice: Choice;
  placeChoice: Choice;
  onTimeChoice: (choice: Choice) => void;
  onPlaceChoice: (choice: Choice) => void;
  allowOther: boolean;
  otherTime: string;
  otherPlace: string;
  otherPlaceNote: string;
  onOtherPlaceNote: (value: string) => void;
  onOtherTime: (value: string) => void;
  onOtherPlace: (value: string) => void;
  timeError?: string;
  placeError?: string;
};

const legendStyle =
  "mb-2 text-xs font-medium uppercase tracking-wide text-muted";

const cardStyle =
  "block cursor-pointer rounded-xl border-2 border-line bg-surface px-3.5 py-3 text-base text-ink " +
  "peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white " +
  "peer-focus-visible:ring-2 peer-focus-visible:ring-accent";

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
  otherPlaceNote,
  onOtherPlaceNote,
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
                {place.photoUrl && (
                  <Image
                    src={place.photoUrl}
                    alt={`Photo of ${place.name}`}
                    width={400}
                    height={220}
                    className="mb-2 h-28 w-full rounded-lg object-cover"
                  />
                )}
                <span className="block">{place.name}</span>
                {place.note && (
                  <span className="mt-0.5 block text-xs opacity-75">
                    {place.note}
                  </span>
                )}
              </label>
              <MapsLink place={place.name} className="mt-1 ml-1" />
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
                <>
                  <input
                    type="text"
                    value={otherPlace}
                    onChange={(event) => onOtherPlace(event.target.value)}
                    placeholder="Where would you like to go?"
                    maxLength={PLACE_NAME_MAX_LENGTH}
                    aria-label="Your place"
                    className={fieldStyle}
                  />
                  <input
                    type="text"
                    value={otherPlaceNote}
                    onChange={(event) => onOtherPlaceNote(event.target.value)}
                    placeholder="by the entrance — optional"
                    maxLength={PLACE_NOTE_MAX_LENGTH}
                    aria-label="A hint to your place"
                    className={fieldStyle}
                  />
                </>
              )}
            </div>
          )}
        </div>
        {placeError && <p className={errorStyle}>{placeError}</p>}
      </fieldset>
    </div>
  );
}
