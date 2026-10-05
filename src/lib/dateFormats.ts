import { DateFormat } from "@/generated/prisma/enums";

type FormatInfo = {
  label: string;
  emoji: string;
  invitePhrase: string;
};

// Record<DateFormat, ...> makes TypeScript require every format.
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

export const FORMAT_ORDER: DateFormat[] = [
  DateFormat.COFFEE,
  DateFormat.WALK,
  DateFormat.DINNER,
  DateFormat.MOVIE,
  DateFormat.SURPRISE,
];
