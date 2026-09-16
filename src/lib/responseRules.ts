import { ResponseType } from "@/generated/prisma/enums";
import {
  AUTHOR_NAME_MAX_LENGTH,
  PLACE_NAME_MAX_LENGTH,
  RESPONSE_MESSAGE_MAX_LENGTH,
  isZonedTime,
} from "@/lib/inviteRules";

// What the answer form sends us.
export type SubmitResponseInput = {
  token: string; // the public token from the link
  type: ResponseType;
  respondentName: string;
  message: string;
  timeId: number | null; // one of the author's time options
  placeId: number | null; // one of the author's place options
  proposedTime: string | null; // the person's own time, UTC with a zone
  proposedPlace: string | null; // the person's own place
};

// "form" is for problems that are not about one field.
export type ResponseErrors = Partial<
  Record<"respondentName" | "message" | "time" | "place" | "form", string>
>;

// The option ids that really belong to this invitation.
export type InviteOptionIds = { timeIds: number[]; placeIds: number[] };

/**
 * Checks an answer before we save it. Runs on the server.
 *
 * We also check that the picked ids belong to THIS invitation.
 * Without that, a direct request could send an id from someone else's
 * invitation, and our answer would point to a stranger's option.
 */
export function validateResponse(
  input: SubmitResponseInput,
  options: InviteOptionIds,
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

  // For "yes" and "counter" both the time and the place need an answer.
  // Own values count only in the counter mode.
  const isCounter = input.type === ResponseType.COUNTER;
  const ownTime = isCounter && input.proposedTime ? input.proposedTime : null;
  const ownPlace = isCounter ? (input.proposedPlace ?? "").trim() : "";

  if (ownTime !== null) {
    if (!isZonedTime(ownTime)) {
      errors.time = "Your time is not a real date";
    } else if (new Date(ownTime) < new Date()) {
      errors.time = "Your time cannot be in the past";
    }
  } else if (input.timeId === null) {
    errors.time = "Pick a time";
  } else if (!options.timeIds.includes(input.timeId)) {
    errors.time = "This time is not in the invitation";
  }

  if (ownPlace !== "") {
    if (ownPlace.length > PLACE_NAME_MAX_LENGTH) {
      errors.place = `Keep it under ${PLACE_NAME_MAX_LENGTH} characters`;
    }
  } else if (input.placeId === null) {
    errors.place = "Pick a place";
  } else if (!options.placeIds.includes(input.placeId)) {
    errors.place = "This place is not in the invitation";
  }

  // A suggestion without anything new is just a "yes".
  if (isCounter && ownTime === null && ownPlace === "") {
    errors.form = "Add your own time or place, or go back";
  }

  return errors;
}
