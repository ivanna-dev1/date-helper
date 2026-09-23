import { ResponseType, WhoPays } from "@/generated/prisma/enums";
import {
  AUTHOR_NAME_MAX_LENGTH,
  MAX_PLACE_OPTIONS,
  MAX_TIME_OPTIONS,
  PLACE_NAME_MAX_LENGTH,
  PLACE_NOTE_MAX_LENGTH,
  RESPONSE_MESSAGE_MAX_LENGTH,
  isZonedTime,
} from "@/lib/inviteRules";

// What the answer form sends us.
export type SubmitResponseInput = {
  token: string; // the public token from the link
  type: ResponseType;
  respondentName: string;
  message: string;
  timeId: number | null; // one of the author's time options, for "yes"
  placeId: number | null; // one of the author's place options, for "yes"
  // A suggestion: one or more own times (UTC with a zone) and places.
  // The same lists as in the author's form, so both screens look alike.
  proposedTimes: string[];
  proposedPlaces: { name: string; note: string }[];
  // Who pays, only with a suggestion. Leave it out to keep the author's.
  whoPays?: WhoPays | null;
};

// "form" is for problems that are not about one field.
export type ResponseErrors = Partial<
  Record<"respondentName" | "message" | "time" | "place" | "form", string>
>;

// What the invitation offers right now: the author's options (to check
// the picked ids and to see whether a suggestion changes anything)
// and who pays.
export type InviteOptions = {
  times: { id: number; startsAt: Date }[];
  places: { id: number; name: string; note: string | null }[];
  whoPays: WhoPays | null;
};

// A list of options as one string, in a fixed order, so two lists can be
// compared: the order does not matter, only what is in them.
export function timesKey(times: (Date | string)[]): string {
  return times
    .map((time) => new Date(time).getTime())
    .sort()
    .join(",");
}

export function placeKey(place: { name: string; note: string | null }): string {
  return `${place.name.toLowerCase()}|${place.note ?? ""}`;
}

export function placesKey(
  places: { name: string; note: string | null }[],
): string {
  return places.map(placeKey).sort().join(",");
}

// The rows of a suggestion without the empty ones, and without repeats.
export function cleanTimes(times: string[]): string[] {
  return [...new Set(times.filter((time) => time !== ""))];
}

export function cleanPlaces(
  places: { name: string; note: string }[],
): { name: string; note: string }[] {
  return places
    .map((place) => ({ name: place.name.trim(), note: place.note.trim() }))
    .filter((place) => place.name !== "")
    .filter(
      (place, index, list) =>
        list.findIndex((other) => placeKey(other) === placeKey(place)) ===
        index,
    );
}

/**
 * Checks an answer before we save it. Runs on the server.
 *
 * We also check that the picked ids belong to THIS invitation.
 * Without that, a direct request could send an id from someone else's
 * invitation, and our answer would point to a stranger's option.
 */
export function validateResponse(
  input: SubmitResponseInput,
  options: InviteOptions,
): ResponseErrors {
  const errors: ResponseErrors = {};

  const name = input.respondentName.trim();
  if (name === "") {
    errors.respondentName = "Please add your name";
  } else if (name.length > AUTHOR_NAME_MAX_LENGTH) {
    errors.respondentName = `Keep it under ${AUTHOR_NAME_MAX_LENGTH} characters`;
  }

  if (input.message.trim().length > RESPONSE_MESSAGE_MAX_LENGTH) {
    errors.message = `Keep it under ${RESPONSE_MESSAGE_MAX_LENGTH} characters`;
  }

  // A wrong value can only come from a direct request, not from our form.
  if (!Object.values(ResponseType).includes(input.type)) {
    errors.form = "Unknown answer";
    return errors;
  }

  // "No" needs nothing else: no time, no place.
  if (input.type === ResponseType.NO) {
    return errors;
  }

  const isCounter = input.type === ResponseType.COUNTER;

  // A suggestion: the same lists as in the author's form.
  if (isCounter) {
    const times = cleanTimes(input.proposedTimes);
    const places = cleanPlaces(input.proposedPlaces);

    if (times.length === 0) {
      errors.time = "Add a time";
    } else if (times.length > MAX_TIME_OPTIONS) {
      errors.time = `No more than ${MAX_TIME_OPTIONS} options`;
    } else if (times.some((time) => !isZonedTime(time))) {
      errors.time = "One of the times is not a real date";
    } else if (times.some((time) => new Date(time) < new Date())) {
      errors.time = "A time cannot be in the past";
    }

    if (places.length === 0) {
      errors.place = "Add a place";
    } else if (places.length > MAX_PLACE_OPTIONS) {
      errors.place = `No more than ${MAX_PLACE_OPTIONS} options`;
    } else if (
      places.some((place) => place.name.length > PLACE_NAME_MAX_LENGTH)
    ) {
      errors.place = `Keep a place under ${PLACE_NAME_MAX_LENGTH} characters`;
    } else if (
      places.some((place) => place.note.length > PLACE_NOTE_MAX_LENGTH)
    ) {
      errors.place = `Keep a note under ${PLACE_NOTE_MAX_LENGTH} characters`;
    }

    // A suggestion must change something: for "the same again" there is
    // the "yes" button.
    const changesWhoPays =
      input.whoPays !== undefined && input.whoPays !== options.whoPays;
    const sameTimes =
      timesKey(times) === timesKey(options.times.map((time) => time.startsAt));
    const samePlaces = placesKey(places) === placesKey(options.places);
    if (
      Object.keys(errors).length === 0 &&
      sameTimes &&
      samePlaces &&
      !changesWhoPays
    ) {
      errors.form = "Change the time, the place or who pays, or go back";
    }
  } else {
    // "Yes": one of the author's options, and it must be from this invitation.
    if (input.timeId === null) {
      errors.time = "Pick a time";
    } else if (!options.times.some((time) => time.id === input.timeId)) {
      errors.time = "This time is not in the invitation";
    }
    if (input.placeId === null) {
      errors.place = "Pick a place";
    } else if (!options.places.some((place) => place.id === input.placeId)) {
      errors.place = "This place is not in the invitation";
    }
  }

  // A wrong value can only come from a direct request, not from our form.
  if (
    input.whoPays !== undefined &&
    input.whoPays !== null &&
    !Object.values(WhoPays).includes(input.whoPays)
  ) {
    errors.form = "Unknown option for who pays";
  }

  return errors;
}
