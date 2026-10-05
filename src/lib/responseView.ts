import type { Prisma } from "@/generated/prisma/client";
import { InviteStatus, Party, ResponseType } from "@/generated/prisma/enums";

export type AnswerOutcome =
  | "yes"
  | "no"
  | "suggested"
  | "authorSuggested"
  | "suggestionAccepted"
  | "suggestionDeclined";

// Old invitations have no value: the guest made it.
export type Proposer = "author" | "guest";

export type TurnTimeView = { id: number; startsAt: string };
export type TurnPlaceView = { id: number; name: string; note: string | null };

// An answer in a simple form, ready to show on the screen.
// Only plain values, so it can go from the server to a client component.
export type SentAnswer = {
  outcome: AnswerOutcome;
  proposedBy: Proposer;
  time: string | null;
  place: string | null;
  placeNote: string | null;
  isOwnTime: boolean;
  isOwnPlace: boolean;
  choices: { times: TurnTimeView[]; places: TurnPlaceView[] } | null;
};

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

type StoredResponse = Prisma.ResponseGetPayload<{
  select: typeof RESPONSE_VIEW_SELECT;
}>;

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

export function toProposer(party: Party | null): Proposer {
  return party === Party.AUTHOR ? "author" : "guest";
}

export function toSentAnswer(
  response: StoredResponse,
  status: InviteStatus,
  lastProposedBy: Party | null = null,
  turn: StoredTurnOptions | null = null,
): SentAnswer {
  const proposedBy = toProposer(lastProposedBy);
  const outcome = getOutcome(response.type, status, proposedBy);

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

  const time = response.proposedTime ?? response.chosenTime?.startsAt;
  const place = response.proposedPlace ?? response.chosenPlace?.name;

  return {
    outcome,
    proposedBy,
    time: time ? time.toISOString() : null,
    place: place ?? null,
    placeNote: response.proposedPlace
      ? response.proposedPlaceNote
      : (response.chosenPlace?.note ?? null),
    isOwnTime: response.proposedTime !== null,
    isOwnPlace: response.proposedPlace !== null,
    choices: null,
  };
}

export type LastWords = { by: Proposer; text: string };

// Before any move: the guest's words from the first answer. After a move only that move's words count, even if empty.
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
