"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/tokens";
import { getBrowserRole, rememberBrowserRole } from "@/lib/browserRole";
import {
  isZonedTime,
  MAX_PLACE_OPTIONS,
  MAX_TIME_OPTIONS,
  PLACE_NAME_MAX_LENGTH,
  PLACE_NOTE_MAX_LENGTH,
  RESPONSE_MESSAGE_MAX_LENGTH,
  validateInvite,
  type CreateInviteInput,
  type InviteErrors,
} from "@/lib/inviteRules";
import {
  validateResponse,
  type ResponseErrors,
  type SubmitResponseInput,
} from "@/lib/responseRules";
import {
  InviteStatus,
  Party,
  ResponseType,
  WhoPays,
} from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";

// We return something only when the data is wrong.
// When everything is fine, the action redirects and never returns.
export type CreateInviteResult = { errors: InviteErrors };

export async function createInvite(
  input: CreateInviteInput,
): Promise<CreateInviteResult> {
  const errors = validateInvite(input);

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + input.expiryDays);

  const times = input.times.filter((time) => time !== "");
  const places = input.places.filter((place) => place.name.trim() !== "");

  // One nested create. Prisma wraps it in a transaction on its own:
  // either the invite and all its options are saved, or nothing is.
  const invite = await prisma.invite.create({
    data: {
      publicToken: createToken(),
      secretToken: createToken(),
      friendToken: createToken(),
      authorName: input.authorName.trim(),
      message: input.message.trim(),
      format: input.format,
      whoPays: input.whoPays,
      expiresAt,
      timeOptions: {
        // Times come as UTC strings with a zone ("...Z"), so new Date()
        // gives the same moment on any server, in any time zone.
        create: times.map((time) => ({ startsAt: new Date(time) })),
      },
      placeOptions: {
        create: places.map((place) => ({
          name: place.name.trim(),
          note: place.note.trim() || null,
        })),
      },
    },
  });

  // This browser is the author's now: it must not answer this invitation
  // as the invited person by mistake.
  await rememberBrowserRole(invite.publicToken, "author");

  // redirect() throws a special error that Next.js catches.
  // Code after this line never runs.
  redirect(`/manage/${invite.secretToken}`);
}

// Two shapes of answer: saved, or a list of problems.
// turnToken comes back after a suggestion: the guest sends it to the author,
// so the author can answer from that link.
export type SubmitResponseResult =
  | { ok: true; turnToken: string | null }
  | { ok: false; errors: ResponseErrors };

// Which invitation status each kind of answer leads to.
const STATUS_BY_TYPE: Record<ResponseType, InviteStatus> = {
  [ResponseType.YES]: InviteStatus.CONFIRMED,
  [ResponseType.NO]: InviteStatus.DECLINED,
  [ResponseType.COUNTER]: InviteStatus.COUNTER,
};

const ALREADY_ANSWERED = "This invitation already has an answer";

// Prisma's code for "a unique field already has this value".
const UNIQUE_CONSTRAINT_FAILED = "P2002";
// Prisma's code for "the row to change was not found".
const RECORD_NOT_FOUND = "P2025";

const CANCELLED_MESSAGE = "This invitation was cancelled";

export async function submitResponse(
  input: SubmitResponseInput,
): Promise<SubmitResponseResult> {
  // Only the ids of the options: we need them to check the answer.
  const invite = await prisma.invite.findUnique({
    where: { publicToken: input.token },
    select: {
      id: true,
      expiresAt: true,
      status: true,
      whoPays: true,
      response: { select: { id: true } },
      timeOptions: { select: { id: true } },
      placeOptions: { select: { id: true } },
    },
  });

  if (!invite) {
    return { ok: false, errors: { form: "This invitation doesn't exist" } };
  }

  if (invite.status === InviteStatus.CANCELLED) {
    return { ok: false, errors: { form: CANCELLED_MESSAGE } };
  }

  // The author opened their own link, for example to see how it looks.
  if ((await getBrowserRole(input.token)) === "author") {
    return {
      ok: false,
      errors: {
        form: "This is your own invitation — send the link to the person you're inviting",
      },
    };
  }

  // The page already hides the form for an old invitation,
  // but a direct request could still come here.
  if (invite.expiresAt < new Date()) {
    return { ok: false, errors: { form: "This invitation has expired" } };
  }

  // One invitation gets one answer. This check gives a clear message
  // in the usual case: the person opens the link again and answers twice.
  if (invite.response) {
    return { ok: false, errors: { form: ALREADY_ANSWERED } };
  }

  const errors = validateResponse(input, {
    timeIds: invite.timeOptions.map((time) => time.id),
    placeIds: invite.placeOptions.map((place) => place.id),
    whoPays: invite.whoPays,
  });

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const isNo = input.type === ResponseType.NO;
  const isCounter = input.type === ResponseType.COUNTER;

  // Own values are saved only for a counter answer.
  const proposedTime =
    isCounter && input.proposedTime ? new Date(input.proposedTime) : null;
  const proposedPlace = isCounter
    ? (input.proposedPlace ?? "").trim() || null
    : null;
  // The hint belongs to an own place only.
  const proposedPlaceNote = proposedPlace
    ? (input.proposedPlaceNote ?? "").trim() || null
    : null;
  // A suggestion may also change who pays. Not given = keep the author's.
  const whoPaysChange =
    isCounter && input.whoPays !== undefined ? { whoPays: input.whoPays } : {};

  // A picked option is saved only when the person did not suggest their own
  // value instead. For "no" nothing is picked.
  const timeId = isNo || proposedTime ? null : input.timeId;
  const placeId = isNo || proposedPlace ? null : input.placeId;

  // A suggestion starts the back-and-forth: the author gets a fresh link.
  const turnToken = isCounter ? createToken() : null;

  try {
    // One nested write again: the answer and the new status of the
    // invitation are saved together, or not at all.
    // `status: PENDING` in `where`: the answer is saved only if the invite
    // still waits for it. If the author cancelled it a moment ago,
    // Prisma finds no row and throws P2025.
    await prisma.invite.update({
      where: { id: invite.id, status: InviteStatus.PENDING },
      data: {
        status: STATUS_BY_TYPE[input.type],
        turnToken,
        lastProposedBy: isCounter ? Party.GUEST : null,
        ...whoPaysChange,
        response: {
          create: {
            type: input.type,
            respondentName: input.respondentName.trim(),
            message: input.message.trim() || null,
            chosenTime: timeId ? { connect: { id: timeId } } : undefined,
            chosenPlace: placeId ? { connect: { id: placeId } } : undefined,
            proposedTime,
            proposedPlace,
            proposedPlaceNote,
          },
        },
      },
    });
  } catch (error) {
    // The check above is not enough on its own. Two answers can come at the
    // same moment (from a phone and a laptop). Both pass the check, because
    // neither is saved yet. The database stops the second one: `inviteId`
    // in Response is @unique. We turn that error into the same message.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_FAILED
    ) {
      return { ok: false, errors: { form: ALREADY_ANSWERED } };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === RECORD_NOT_FOUND
    ) {
      return { ok: false, errors: { form: CANCELLED_MESSAGE } };
    }
    // Any other error is unexpected, so we let it go up.
    throw error;
  }

  await rememberBrowserRole(input.token, "guest");
  return { ok: true, turnToken };
}

// Who is acting, and by which link. The link decides the rights:
// the secret link and the turn link act for the author,
// the public link acts for the guest.
export type TurnKey =
  | { kind: "secret"; token: string }
  | { kind: "turn"; token: string }
  | { kind: "public"; token: string };

export type TurnInput = {
  key: TurnKey;
  decision: "accept" | "decline" | "counter";
  // Only for "counter": the new times (UTC with a zone) and places with
  // their hints — one or more of each, so the other person can pick.
  // Who pays: left out = keep as it is.
  proposedTimes?: string[];
  proposedPlaces?: { name: string; note: string }[];
  whoPays?: WhoPays | null;
  // Only for "accept" of a move with a choice: the picked options.
  timeId?: number | null;
  placeId?: number | null;
  // A few words with any move. Only the latest words are kept.
  message?: string;
};

export type TurnResult =
  { ok: true; turnToken: string | null } | { ok: false; error: string };

const TURN_TAKEN = "This suggestion already has an answer";

function whereByKey(key: TurnKey) {
  if (key.kind === "secret") return { secretToken: key.token };
  if (key.kind === "turn") return { turnToken: key.token };
  return { publicToken: key.token };
}

type NewPlace = { name: string; note: string };

// Checks the options of a new move. Returns an error text, or null.
function checkTurnOptions(times: string[], places: NewPlace[]): string | null {
  if (times.length === 0) return "Add a time";
  if (times.length > MAX_TIME_OPTIONS) {
    return `No more than ${MAX_TIME_OPTIONS} times`;
  }
  if (times.some((time) => !isZonedTime(time))) {
    return "Pick a real date and time";
  }
  if (times.some((time) => new Date(time) < new Date())) {
    return "The time cannot be in the past";
  }
  if (places.length === 0) return "Add a place";
  if (places.length > MAX_PLACE_OPTIONS) {
    return `No more than ${MAX_PLACE_OPTIONS} places`;
  }
  if (places.some((place) => place.name.length > PLACE_NAME_MAX_LENGTH)) {
    return `Keep the place under ${PLACE_NAME_MAX_LENGTH} characters`;
  }
  if (places.some((place) => place.note.length > PLACE_NOTE_MAX_LENGTH)) {
    return `Keep the hint under ${PLACE_NOTE_MAX_LENGTH} characters`;
  }
  return null;
}

// A list of options as one string, in a fixed order, so two lists can be
// compared: "the same as on the table" does not depend on the order.
function timesKey(times: Date[]): string {
  return times
    .map((time) => time.getTime())
    .sort()
    .join(",");
}
function placeKey(place: { name: string; note: string | null }): string {
  return `${place.name.toLowerCase()}|${place.note ?? ""}`;
}
function placesKey(places: { name: string; note: string | null }[]): string {
  return places.map(placeKey).sort().join(",");
}

// The data of the invitation that a move needs, loaded inside the move's
// transaction.
const TURN_TARGET_SELECT = {
  id: true,
  whoPays: true,
  timeOptions: { select: { id: true, startsAt: true } },
  placeOptions: { select: { id: true, name: true, note: true } },
  turnTimes: { select: { id: true, startsAt: true } },
  turnPlaces: { select: { id: true, name: true, note: true } },
  response: {
    select: {
      proposedTime: true,
      proposedPlace: true,
      proposedPlaceNote: true,
      chosenTime: { select: { startsAt: true } },
      chosenPlace: { select: { name: true, note: true } },
    },
  },
} satisfies Prisma.InviteSelect;

type TurnTarget = Prisma.InviteGetPayload<{
  select: typeof TURN_TARGET_SELECT;
}>;

// The agreed time and place, written into the answer. One of the author's
// first options? Then we link it, not copy its text: the author's hint
// ("by the entrance") stays with the place.
function toAgreedData(
  target: TurnTarget,
  time: Date,
  place: { name: string; note: string | null },
) {
  const note = place.note ?? "";
  const timeOption = target.timeOptions.find(
    (option) => option.startsAt.getTime() === time.getTime(),
  );
  // Only when the hint is the author's too (or empty): a new hint makes
  // it the person's own place.
  const placeOption = target.placeOptions.find(
    (option) =>
      option.name.toLowerCase() === place.name.toLowerCase() &&
      (note === "" || note === (option.note ?? "")),
  );
  return {
    proposedTime: timeOption ? null : time,
    proposedPlace: placeOption ? null : place.name,
    proposedPlaceNote: placeOption ? null : note || null,
    chosenTime: timeOption
      ? { connect: { id: timeOption.id } }
      : { disconnect: true },
    chosenPlace: placeOption
      ? { connect: { id: placeOption.id } }
      : { disconnect: true },
  };
}

/**
 * One move in the back-and-forth: accept, decline, or suggest something else.
 *
 * Only the person who did NOT make the latest suggestion may answer it.
 * The check and the change happen in one conditional update, so two
 * clicks at the same moment (two phones) cannot both win.
 * Only the latest suggestion is kept: a new one replaces the old one.
 */
export async function answerTurn(input: TurnInput): Promise<TurnResult> {
  const actor = input.key.kind === "public" ? Party.GUEST : Party.AUTHOR;

  // The suggestion must come from the other person. Old invitations have
  // no value here: then the guest made it, so the author may answer.
  const madeByOther =
    actor === Party.AUTHOR
      ? { OR: [{ lastProposedBy: Party.GUEST }, { lastProposedBy: null }] }
      : { lastProposedBy: Party.AUTHOR };

  const where = {
    ...whereByKey(input.key),
    status: InviteStatus.COUNTER,
    ...madeByOther,
  };

  // The browser's side of this date. The secret link is the author's
  // own page and proves the side by itself, so it is not checked.
  const role = actor === Party.GUEST ? "guest" : "author";
  const people =
    input.key.kind === "secret"
      ? null
      : await prisma.invite.findFirst({
          where: whereByKey(input.key),
          select: {
            publicToken: true,
            authorName: true,
            response: { select: { respondentName: true } },
          },
        });
  if (people) {
    const browserRole = await getBrowserRole(people.publicToken);
    if (browserRole !== null && browserRole !== role) {
      // The other person's name: the one this link must go to.
      const other =
        role === "guest" ? people.response?.respondentName : people.authorName;
      return {
        ok: false,
        error: `This is your own suggestion — send this link to ${other ?? "them"}`,
      };
    }
  }
  // Called after a move is saved.
  async function rememberRole() {
    if (people) await rememberBrowserRole(people.publicToken, role);
  }

  // The words go with the move and replace the ones before. lastMessageBy is
  // set even without words: it marks that the talk moved on, so older words
  // (for example from the first answer) are not shown as the latest.
  const message = (input.message ?? "").trim();
  if (message.length > RESPONSE_MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep your words under ${RESPONSE_MESSAGE_MAX_LENGTH} characters`,
    };
  }
  const messageData = { turnMessage: message || null, lastMessageBy: actor };

  if (input.decision === "decline") {
    const { count } = await prisma.invite.updateMany({
      where,
      data: { status: InviteStatus.DECLINED, ...messageData },
    });
    // Show the fresh state in any case: if nothing changed, the page was old.
    refresh();
    if (count === 0) return { ok: false, error: TURN_TAKEN };
    await rememberRole();
    return { ok: true, turnToken: null };
  }

  if (input.decision === "accept") {
    // A move with options: the picked ones become the plan. The status,
    // the plan and the removal of the options happen together.
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.invite.findFirst({
        where,
        select: TURN_TARGET_SELECT,
      });
      if (!target) return null;

      const { turnTimes, turnPlaces } = target;
      // Old invitations in the middle of a talk have no option rows: then
      // the plan is already in the answer, and only the status changes.
      const hasOptions = turnTimes.length > 0 && turnPlaces.length > 0;
      // One option is picked by itself; from several, the person picks.
      const time =
        turnTimes.length === 1
          ? turnTimes[0]
          : turnTimes.find((option) => option.id === input.timeId);
      const place =
        turnPlaces.length === 1
          ? turnPlaces[0]
          : turnPlaces.find((option) => option.id === input.placeId);
      if (hasOptions && !time) return "pickTime" as const;
      if (hasOptions && !place) return "pickPlace" as const;

      const { count } = await tx.invite.updateMany({
        where: { id: target.id, ...where },
        data: { status: InviteStatus.CONFIRMED, ...messageData },
      });
      if (count === 0) return null;

      if (time && place) {
        await tx.response.update({
          where: { inviteId: target.id },
          data: toAgreedData(target, time.startsAt, place),
        });
        await tx.turnTime.deleteMany({ where: { inviteId: target.id } });
        await tx.turnPlace.deleteMany({ where: { inviteId: target.id } });
      }
      return "ok" as const;
    });

    refresh();
    if (result === "pickTime") return { ok: false, error: "Pick a time" };
    if (result === "pickPlace") return { ok: false, error: "Pick a place" };
    if (result === null) return { ok: false, error: TURN_TAKEN };
    await rememberRole();
    return { ok: true, turnToken: null };
  }

  // A new suggestion: check it like any other suggestion. Empty rows are
  // dropped, and the same time or place twice counts once.
  const times = [
    ...new Set((input.proposedTimes ?? []).filter((time) => time !== "")),
  ];
  const places = (input.proposedPlaces ?? [])
    .map((place) => ({ name: place.name.trim(), note: place.note.trim() }))
    .filter((place) => place.name !== "")
    .filter(
      (place, index, list) =>
        list.findIndex((other) => placeKey(other) === placeKey(place)) ===
        index,
    );
  const optionsError = checkTurnOptions(times, places);
  if (optionsError) {
    return { ok: false, error: optionsError };
  }
  if (
    input.whoPays !== undefined &&
    input.whoPays !== null &&
    !Object.values(WhoPays).includes(input.whoPays)
  ) {
    return { ok: false, error: "Unknown option for who pays" };
  }

  const newTimes = times.map((time) => new Date(time));

  // The author's turn link stays the same when the author moves (it is
  // their door). A new guest move gives the author a fresh link.
  const newTurnToken = actor === Party.GUEST ? createToken() : null;

  // Several writes that must happen together, so they run in one
  // transaction: all, or none.
  const invite = await prisma.$transaction(async (tx) => {
    const target = await tx.invite.findFirst({
      where,
      select: TURN_TARGET_SELECT,
    });
    if (!target || !target.response) return null;

    // What is on the table now: the options of the latest move, or, before
    // any move, the first suggestion from the answer.
    const current = target.response;
    const hasOptions =
      target.turnTimes.length > 0 && target.turnPlaces.length > 0;
    const currentTime = current.proposedTime ?? current.chosenTime?.startsAt;
    const currentPlace = current.proposedPlace ?? current.chosenPlace?.name;
    const currentNote = current.proposedPlace
      ? current.proposedPlaceNote
      : current.chosenPlace?.note;
    const currentTimes = hasOptions
      ? target.turnTimes.map((option) => option.startsAt)
      : currentTime
        ? [currentTime]
        : [];
    const currentPlaces = hasOptions
      ? target.turnPlaces
      : currentPlace
        ? [{ name: currentPlace, note: currentNote ?? null }]
        : [];

    // The same options as now are not a new suggestion:
    // for that there is "Accept".
    const newWhoPays =
      input.whoPays === undefined ? target.whoPays : input.whoPays;
    if (
      timesKey(currentTimes) === timesKey(newTimes) &&
      placesKey(currentPlaces) === placesKey(places) &&
      target.whoPays === newWhoPays
    ) {
      return "same" as const;
    }

    const { count } = await tx.invite.updateMany({
      where: { id: target.id, ...where },
      data: {
        lastProposedBy: actor,
        whoPays: newWhoPays,
        ...messageData,
        ...(newTurnToken ? { turnToken: newTurnToken } : {}),
      },
    });
    if (count === 0) return null;

    // The new options replace the old ones. The answer's own values are
    // cleared: from now on the options say what is on the table.
    await tx.turnTime.deleteMany({ where: { inviteId: target.id } });
    await tx.turnPlace.deleteMany({ where: { inviteId: target.id } });
    await tx.turnTime.createMany({
      data: newTimes.map((startsAt) => ({ inviteId: target.id, startsAt })),
    });
    await tx.turnPlace.createMany({
      data: places.map((place) => ({
        inviteId: target.id,
        name: place.name,
        note: place.note || null,
      })),
    });
    await tx.response.update({
      where: { inviteId: target.id },
      data: {
        proposedTime: null,
        proposedPlace: null,
        proposedPlaceNote: null,
        chosenTime: { disconnect: true },
        chosenPlace: { disconnect: true },
      },
    });
    return target;
  });

  if (invite === "same") {
    return {
      ok: false,
      error: "Change the time, the place or who pays first",
    };
  }

  refresh();
  if (!invite) return { ok: false, error: TURN_TAKEN };
  await rememberRole();
  return { ok: true, turnToken: newTurnToken };
}

// The author can cancel while the date is still possible: before an answer,
// while a suggestion waits, or after "yes". After "no" there is nothing
// to cancel.
const CANCELLABLE_STATUSES: InviteStatus[] = [
  InviteStatus.PENDING,
  InviteStatus.COUNTER,
  InviteStatus.CONFIRMED,
];

export type CancelInviteResult = { ok: true } | { ok: false; error: string };

export async function cancelInvite(
  secretToken: string,
): Promise<CancelInviteResult> {
  // The same conditional update as in answerSuggestion:
  // the check and the change happen in one query.
  const { count } = await prisma.invite.updateMany({
    where: { secretToken, status: { in: CANCELLABLE_STATUSES } },
    data: { status: InviteStatus.CANCELLED },
  });

  // Show the fresh status in any case.
  refresh();

  if (count === 0) {
    return { ok: false, error: "This invitation can't be cancelled anymore" };
  }

  return { ok: true };
}
