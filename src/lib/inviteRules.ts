import { DateFormat, WhoPays } from "@/generated/prisma/enums";

// One place for all the rules. The form and the server both read them,
// so they can never disagree.
export const AUTHOR_NAME_MAX_LENGTH = 50;
export const MESSAGE_MAX_LENGTH = 120;
export const PLACE_NAME_MAX_LENGTH = 60;
export const PLACE_NOTE_MAX_LENGTH = 60;

export const MAX_TIME_OPTIONS = 5;
export const MAX_PLACE_OPTIONS = 5;

export const EXPIRY_OPTIONS = [7, 14, 30];
export const DEFAULT_EXPIRY_DAYS = 30;

export type CreateInviteInput = {
  authorName: string;
  message: string;
  format: DateFormat;
  whoPays: WhoPays | null;
  expiryDays: number;
  times: string[]; // "2026-09-12T18:00"
  places: { name: string; note: string }[];
};

// Field name -> message shown under that field.
export type InviteErrors = Partial<Record<keyof CreateInviteInput, string>>;

/**
 * Checks the data before we save it.
 *
 * This runs on the server. A Server Action can be called by a direct POST
 * request, without our form, so we cannot trust anything that comes in.
 */
export function validateInvite(input: CreateInviteInput): InviteErrors {
  const errors: InviteErrors = {};

  const authorName = input.authorName.trim();
  if (authorName === "") {
    errors.authorName = "Please add your name";
  } else if (authorName.length > AUTHOR_NAME_MAX_LENGTH) {
    errors.authorName = `Keep it under ${AUTHOR_NAME_MAX_LENGTH} characters`;
  }

  const message = input.message.trim();
  if (message === "") {
    errors.message = "Write a few words";
  } else if (message.length > MESSAGE_MAX_LENGTH) {
    errors.message = `Keep it under ${MESSAGE_MAX_LENGTH} characters`;
  }

  // A wrong value can only come from a direct request, not from our form.
  if (!Object.values(DateFormat).includes(input.format)) {
    errors.format = "Pick what you are inviting to";
  }

  if (input.whoPays !== null && !Object.values(WhoPays).includes(input.whoPays)) {
    errors.whoPays = "Unknown option";
  }

  if (!EXPIRY_OPTIONS.includes(input.expiryDays)) {
    errors.expiryDays = "Pick how long the link stays alive";
  }

  const times = input.times.filter((time) => time !== "");
  if (times.length === 0) {
    errors.times = "Add at least one time";
  } else if (times.length > MAX_TIME_OPTIONS) {
    errors.times = `No more than ${MAX_TIME_OPTIONS} options`;
  } else if (times.some((time) => Number.isNaN(new Date(time).getTime()))) {
    errors.times = "One of the times is not a real date";
  } else if (times.some((time) => new Date(time) < new Date())) {
    errors.times = "A date cannot be in the past";
  }

  const places = input.places.filter((place) => place.name.trim() !== "");
  if (places.length === 0) {
    errors.places = "Add at least one place";
  } else if (places.length > MAX_PLACE_OPTIONS) {
    errors.places = `No more than ${MAX_PLACE_OPTIONS} options`;
  } else if (
    places.some(
      (place) =>
        place.name.trim().length > PLACE_NAME_MAX_LENGTH ||
        place.note.trim().length > PLACE_NOTE_MAX_LENGTH,
    )
  ) {
    errors.places = "A place name or note is too long";
  }

  return errors;
}
