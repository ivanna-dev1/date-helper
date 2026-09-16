import type { Prisma } from "@/generated/prisma/client";
import {
  InviteStatus,
  ResponseType,
} from "@/generated/prisma/enums";

// Where the story of an invitation is now, as the screens see it.
// "suggested" means the author has not decided yet.
export type AnswerOutcome =
  | "yes"
  | "no"
  | "suggested"
  | "suggestionAccepted"
  | "suggestionDeclined";

// An answer in a simple form, ready to show on the screen.
// Only plain values, so it can go from the server to a client component.
export type SentAnswer = {
  outcome: AnswerOutcome;
  time: string | null; // ISO string
  place: string | null;
  isOwnTime: boolean; // true when the person suggested their own time
  isOwnPlace: boolean;
};

// The fields of an answer that both pages need.
// Both pages use this in their query, so they always load the same data.
export const RESPONSE_VIEW_SELECT = {
  type: true,
  respondentName: true,
  message: true,
  proposedTime: true,
  proposedPlace: true,
  chosenTime: { select: { startsAt: true } },
  chosenPlace: { select: { name: true } },
} satisfies Prisma.ResponseSelect;

// The type of one answer loaded with the select above.
type StoredResponse = Prisma.ResponseGetPayload<{
  select: typeof RESPONSE_VIEW_SELECT;
}>;

// The kind of answer tells most of the story. For a suggestion,
// the invitation status also tells what the author decided.
export function getOutcome(
  type: ResponseType,
  status: InviteStatus,
): AnswerOutcome {
  if (type === ResponseType.YES) return "yes";
  if (type === ResponseType.NO) return "no";
  if (status === InviteStatus.CONFIRMED) return "suggestionAccepted";
  if (status === InviteStatus.DECLINED) return "suggestionDeclined";
  return "suggested";
}

// Turns an answer from the database into what the screen shows.
export function toSentAnswer(
  response: StoredResponse,
  status: InviteStatus,
): SentAnswer {
  // An own value wins over a picked option, like when saving.
  const time = response.proposedTime ?? response.chosenTime?.startsAt;
  const place = response.proposedPlace ?? response.chosenPlace?.name;

  return {
    outcome: getOutcome(response.type, status),
    // Date objects become strings before going to the client.
    time: time ? time.toISOString() : null,
    place: place ?? null,
    isOwnTime: response.proposedTime !== null,
    isOwnPlace: response.proposedPlace !== null,
  };
}
