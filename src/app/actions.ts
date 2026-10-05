"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/tokens";
import { getBrowserRole, rememberBrowserRole } from "@/lib/browserRole";
import { TURN_OPTIONS_SELECT } from "@/lib/responseView";
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
  cleanPlaces,
  cleanTimes,
  placesKey,
  timesKey,
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

// Returns something only on errors; success redirects.
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
        // UTC strings with a zone: the same moment on any server.
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

  // This browser is now the author's: it must not answer as the guest.
  await rememberBrowserRole(invite.publicToken, "author");

  redirect(`/manage/${invite.secretToken}`);
}

// turnToken comes back after a suggestion so the author can answer from that link.
export type SubmitResponseResult =
  | {
      ok: true;
      turnToken: string | null;
      choices: {
        times: { id: number; startsAt: string }[];
        places: { id: number; name: string; note: string | null }[];
      } | null;
    }
  | { ok: false; errors: ResponseErrors };

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
  const invite = await prisma.invite.findUnique({
    where: { publicToken: input.token },
    select: {
      id: true,
      expiresAt: true,
      status: true,
      whoPays: true,
      response: { select: { id: true } },
      timeOptions: { select: { id: true, startsAt: true } },
      placeOptions: { select: { id: true, name: true, note: true } },
    },
  });

  if (!invite) {
    return { ok: false, errors: { form: "This invitation doesn't exist" } };
  }

  if (invite.status === InviteStatus.CANCELLED) {
    return { ok: false, errors: { form: CANCELLED_MESSAGE } };
  }

  if ((await getBrowserRole(input.token)) === "author") {
    return {
      ok: false,
      errors: {
        form: "This is your own invitation — send the link to the person you're inviting",
      },
    };
  }

  // Direct requests can bypass the hidden form.
  if (invite.expiresAt < new Date()) {
    return { ok: false, errors: { form: "This invitation has expired" } };
  }

  if (invite.response) {
    return { ok: false, errors: { form: ALREADY_ANSWERED } };
  }

  const errors = validateResponse(input, {
    times: invite.timeOptions,
    places: invite.placeOptions,
    whoPays: invite.whoPays,
  });

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const isNo = input.type === ResponseType.NO;
  const isCounter = input.type === ResponseType.COUNTER;

  const times = isCounter ? cleanTimes(input.proposedTimes) : [];
  const places = isCounter ? cleanPlaces(input.proposedPlaces) : [];
  const whoPaysChange =
    isCounter && input.whoPays !== undefined ? { whoPays: input.whoPays } : {};

  const timeId = isNo || isCounter ? null : input.timeId;
  const placeId = isNo || isCounter ? null : input.placeId;

  const turnToken = isCounter ? createToken() : null;
  let savedChoices: (SubmitResponseResult & { ok: true })["choices"] = null;

  try {
    // `status: PENDING` makes the write fail (P2025) if the author cancelled meanwhile.
    const saved = await prisma.invite.update({
      where: { id: invite.id, status: InviteStatus.PENDING },
      data: {
        status: STATUS_BY_TYPE[input.type],
        turnToken,
        lastProposedBy: isCounter ? Party.GUEST : null,
        ...whoPaysChange,
        turnTimes: {
          create: times.map((time) => ({ startsAt: new Date(time) })),
        },
        turnPlaces: {
          create: places.map((place) => ({
            name: place.name,
            note: place.note || null,
          })),
        },
        response: {
          create: {
            type: input.type,
            respondentName: input.respondentName.trim(),
            message: input.message.trim() || null,
            chosenTime: timeId ? { connect: { id: timeId } } : undefined,
            chosenPlace: placeId ? { connect: { id: placeId } } : undefined,
          },
        },
      },
      select: { ...TURN_OPTIONS_SELECT },
    });
    savedChoices = isCounter
      ? {
          times: saved.turnTimes.map((time) => ({
            id: time.id,
            startsAt: time.startsAt.toISOString(),
          })),
          places: saved.turnPlaces,
        }
      : null;
  } catch (error) {
    // Two simultaneous answers both pass the check above; @unique on inviteId stops the second.
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
    throw error;
  }

  await rememberBrowserRole(input.token, "guest");
  return { ok: true, turnToken, choices: savedChoices };
}

// The link decides the rights: secret and turn links act as the author, the public link as the guest.
export type TurnKey =
  | { kind: "secret"; token: string }
  | { kind: "turn"; token: string }
  | { kind: "public"; token: string };

export type TurnInput = {
  key: TurnKey;
  decision: "accept" | "decline" | "counter";
  proposedTimes?: string[];
  proposedPlaces?: { name: string; note: string }[];
  whoPays?: WhoPays | null;
  timeId?: number | null;
  placeId?: number | null;
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

// Link one of the author's options instead of copying it, so its hint stays.
function toAgreedData(
  target: TurnTarget,
  time: Date,
  place: { name: string; note: string | null },
) {
  const note = place.note ?? "";
  const timeOption = target.timeOptions.find(
    (option) => option.startsAt.getTime() === time.getTime(),
  );
  // A new hint makes it the person's own place.
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

// Only the person who did not make the latest suggestion may answer. Check and change are one
// conditional update, so two clicks cannot both win.
export async function answerTurn(input: TurnInput): Promise<TurnResult> {
  const actor = input.key.kind === "public" ? Party.GUEST : Party.AUTHOR;

  // Old invitations have no value: the guest made it.
  const madeByOther =
    actor === Party.AUTHOR
      ? { OR: [{ lastProposedBy: Party.GUEST }, { lastProposedBy: null }] }
      : { lastProposedBy: Party.AUTHOR };

  const where = {
    ...whereByKey(input.key),
    status: InviteStatus.COUNTER,
    ...madeByOther,
  };

  // The secret link proves the author's side by itself.
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
      const other =
        role === "guest" ? people.response?.respondentName : people.authorName;
      return {
        ok: false,
        error: `This is your own suggestion — send this link to ${other ?? "them"}`,
      };
    }
  }
  async function rememberRole() {
    if (people) await rememberBrowserRole(people.publicToken, role);
  }

  // lastMessageBy is set even without words, so older words are not shown as the latest.
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
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.invite.findFirst({
        where,
        select: TURN_TARGET_SELECT,
      });
      if (!target) return null;

      const { turnTimes, turnPlaces } = target;
      // Old invitations have no option rows: the plan is already in the answer.
      const hasOptions = turnTimes.length > 0 && turnPlaces.length > 0;
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

  const times = cleanTimes(input.proposedTimes ?? []);
  const places = cleanPlaces(input.proposedPlaces ?? []);
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

  // The author's turn link stays when the author moves; a guest move makes a fresh one.
  const newTurnToken = actor === Party.GUEST ? createToken() : null;

  const invite = await prisma.$transaction(async (tx) => {
    const target = await tx.invite.findFirst({
      where,
      select: TURN_TARGET_SELECT,
    });
    if (!target || !target.response) return null;

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

    // The same options as now is not a new suggestion (use "Accept").
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

const CANCELLABLE_STATUSES: InviteStatus[] = [
  InviteStatus.PENDING,
  InviteStatus.COUNTER,
  InviteStatus.CONFIRMED,
];

export type CancelInviteResult = { ok: true } | { ok: false; error: string };

export async function cancelInvite(
  secretToken: string,
): Promise<CancelInviteResult> {
  const { count } = await prisma.invite.updateMany({
    where: { secretToken, status: { in: CANCELLABLE_STATUSES } },
    data: { status: InviteStatus.CANCELLED },
  });

  refresh();

  if (count === 0) {
    return { ok: false, error: "This invitation can't be cancelled anymore" };
  }

  return { ok: true };
}
