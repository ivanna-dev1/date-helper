import type { Prisma } from "@/generated/prisma/client";
import { InviteStatus, Party, ResponseType } from "@/generated/prisma/enums";

// Where the story of an invitation is now, as the screens see it.
// "suggested"       — the guest suggested something, the author decides;
// "authorSuggested" — the author suggested something back, the guest decides;
// "suggestionAccepted" / "suggestionDeclined" — the last suggestion got
// its answer (who made it is in `proposedBy`).
export type AnswerOutcome =
  | "yes"
  | "no"
  | "suggested"
  | "authorSuggested"
  | "suggestionAccepted"
  | "suggestionDeclined";

// Who made the latest suggestion. Old invitations have no value in the
// database: then it was the guest, because only the guest could suggest.
export type Proposer = "author" | "guest";

// An answer in a simple form, ready to show on the screen.
// Only plain values, so it can go from the server to a client component.
export type SentAnswer = {
  outcome: AnswerOutcome;
  proposedBy: Proposer;
  time: string | null; // ISO string
  place: string | null;
  placeNote: string | null; // the author's hint, "by the entrance"
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
  proposedPlaceNote: true,
  chosenTime: { select: { startsAt: true } },
  chosenPlace: { select: { name: true, note: true } },
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
  proposedBy: Proposer = "guest",
): AnswerOutcome {
  if (type === ResponseType.YES) return "yes";
  if (type === ResponseType.NO) return "no";
  if (status === InviteStatus.CONFIRMED) return "suggestionAccepted";
  if (status === InviteStatus.DECLINED) return "suggestionDeclined";
  return proposedBy === "author" ? "authorSuggested" : "suggested";
}

// The database value turned into the word the screens use.
export function toProposer(party: Party | null): Proposer {
  return party === Party.AUTHOR ? "author" : "guest";
}

// Turns an answer from the database into what the screen shows.
export function toSentAnswer(
  response: StoredResponse,
  status: InviteStatus,
  lastProposedBy: Party | null = null,
): SentAnswer {
  const proposedBy = toProposer(lastProposedBy);
  // An own value wins over a picked option, like when saving.
  const time = response.proposedTime ?? response.chosenTime?.startsAt;
  const place = response.proposedPlace ?? response.chosenPlace?.name;

  return {
    outcome: getOutcome(response.type, status, proposedBy),
    proposedBy,
    // Date objects become strings before going to the client.
    time: time ? time.toISOString() : null,
    place: place ?? null,
    // An own place has no note: only the author writes notes.
    // An own place has its own hint; an author's option keeps the author's.
    placeNote: response.proposedPlace
      ? response.proposedPlaceNote
      : (response.chosenPlace?.note ?? null),
    isOwnTime: response.proposedTime !== null,
    isOwnPlace: response.proposedPlace !== null,
  };
}

// The latest few words of the back-and-forth and who wrote them.
export type LastWords = { by: Proposer; text: string };

// Before any move, the latest words are the guest's words from the first
// answer. After a move, only that move's words count — even if it had none,
// so old words are not shown as fresh.
export function getLastWords(
  lastMessageBy: Party | null,
  turnMessage: string | null,
  firstAnswerMessage: string | null,
): LastWords | null {
  if (lastMessageBy === null) {
    return firstAnswerMessage
      ? { by: "guest", text: firstAnswerMessage }
      : null;
  }
  return turnMessage
    ? { by: toProposer(lastMessageBy), text: turnMessage }
    : null;
}
