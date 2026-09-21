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

// One option of a move with a choice, in a form a client component can get.
// The same shape as the author's first options, so the same cards show them.
export type TurnTimeView = { id: number; startsAt: string }; // ISO string
export type TurnPlaceView = { id: number; name: string; note: string | null };

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
  // The latest move gave a choice ("Friday or Saturday?"): all its options.
  // Then `time` and `place` are empty until the other person picks one.
  // Null when the move is one time and one place.
  choices: { times: TurnTimeView[]; places: TurnPlaceView[] } | null;
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

// The options of the latest move. They live on the invitation, so the pages
// add this to the invitation's select, next to the answer.
export const TURN_OPTIONS_SELECT = {
  turnTimes: {
    select: { id: true, startsAt: true },
    orderBy: { startsAt: "asc" },
  },
  turnPlaces: {
    select: { id: true, name: true, note: true },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.InviteSelect;

type StoredTurnOptions = Prisma.InviteGetPayload<{
  select: typeof TURN_OPTIONS_SELECT;
}>;

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
  turn: StoredTurnOptions | null = null,
): SentAnswer {
  const proposedBy = toProposer(lastProposedBy);
  const outcome = getOutcome(response.type, status, proposedBy);

  // A move in the back-and-forth keeps its options in their own rows.
  // No note "(Max's idea)" for them: after a few moves it is not clear
  // any more whose idea each part was.
  const turnTimes = turn?.turnTimes ?? [];
  const turnPlaces = turn?.turnPlaces ?? [];
  if (turnTimes.length > 0 && turnPlaces.length > 0) {
    const hasChoice = turnTimes.length > 1 || turnPlaces.length > 1;
    const onlyTime = hasChoice ? null : turnTimes[0];
    const onlyPlace = hasChoice ? null : turnPlaces[0];
    return {
      outcome,
      proposedBy,
      time: onlyTime ? onlyTime.startsAt.toISOString() : null,
      place: onlyPlace?.name ?? null,
      placeNote: onlyPlace?.note ?? null,
      isOwnTime: false,
      isOwnPlace: false,
      choices: hasChoice
        ? {
            times: turnTimes.map((time) => ({
              id: time.id,
              startsAt: time.startsAt.toISOString(),
            })),
            places: turnPlaces,
          }
        : null,
    };
  }

  // An own value wins over a picked option, like when saving.
  const time = response.proposedTime ?? response.chosenTime?.startsAt;
  const place = response.proposedPlace ?? response.chosenPlace?.name;

  return {
    outcome,
    proposedBy,
    // Date objects become strings before going to the client.
    time: time ? time.toISOString() : null,
    place: place ?? null,
    // An own place has its own hint; an author's option keeps the author's.
    placeNote: response.proposedPlace
      ? response.proposedPlaceNote
      : (response.chosenPlace?.note ?? null),
    isOwnTime: response.proposedTime !== null,
    isOwnPlace: response.proposedPlace !== null,
    choices: null,
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
