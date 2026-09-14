import { DateFormat } from "@/generated/prisma/enums";

// Everything that depends on the date format, in one place.
// The form and the invitation page both read it.
type FormatInfo = {
  label: string; // short name for the chips in the form
  emoji: string; // shown on the invitation card, not in the form
  invitePhrase: string; // goes after the author's name
};

// Record<DateFormat, ...> makes TypeScript check that every format is here.
export const DATE_FORMATS: Record<DateFormat, FormatInfo> = {
  [DateFormat.COFFEE]: {
    label: "Coffee",
    emoji: "☕",
    invitePhrase: "is asking you out for coffee",
  },
  [DateFormat.WALK]: {
    label: "Walk",
    emoji: "🌿",
    invitePhrase: "is asking you out for a walk",
  },
  [DateFormat.DINNER]: {
    label: "Dinner",
    emoji: "🍝",
    invitePhrase: "is asking you out to dinner",
  },
  [DateFormat.MOVIE]: {
    label: "Movie",
    emoji: "🎬",
    invitePhrase: "is asking you out to the movies",
  },
  [DateFormat.SURPRISE]: {
    label: "Surprise",
    emoji: "✨",
    invitePhrase: "has a surprise date planned for you",
  },
};

// The same data as a list, in a fixed order, for rendering the chips.
export const FORMAT_ORDER: DateFormat[] = [
  DateFormat.COFFEE,
  DateFormat.WALK,
  DateFormat.DINNER,
  DateFormat.MOVIE,
  DateFormat.SURPRISE,
];
