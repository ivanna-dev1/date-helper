"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/tokens";
import {
  isZonedTime,
  PLACE_NAME_MAX_LENGTH,
  validateInvite,
  type CreateInviteInput,
  type InviteErrors,
} from "@/lib/inviteRules";
import {
  validateResponse,
  type ResponseErrors,
  type SubmitResponseInput,
} from "@/lib/responseRules";
import { InviteStatus, Party, ResponseType } from "@/generated/prisma/enums";
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
        response: {
          create: {
            type: input.type,
            respondentName: input.respondentName.trim(),
            message: input.message.trim() || null,
            chosenTime: timeId ? { connect: { id: timeId } } : undefined,
            chosenPlace: placeId ? { connect: { id: placeId } } : undefined,
            proposedTime,
            proposedPlace,
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
  // Only for "counter": the new time (UTC with a zone) and place.
  proposedTime?: string;
  proposedPlace?: string;
};

export type TurnResult =
  | { ok: true; turnToken: string | null }
  | { ok: false; error: string };

const TURN_TAKEN = "This suggestion already has an answer";

function whereByKey(key: TurnKey) {
  if (key.kind === "secret") return { secretToken: key.token };
  if (key.kind === "turn") return { turnToken: key.token };
  return { publicToken: key.token };
}

/**
 * One move in the back-and-forth: accept, decline, or suggest something else.
 *
 * Only the person who did NOT make the latest suggestion may answer it.
 * The check and the change happen in one conditional update, so two
 * clicks at the same moment (two phones) cannot both win.
 * Only the latest suggestion is kept: a new one overwrites the old one.
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

  if (input.decision !== "counter") {
    const { count } = await prisma.invite.updateMany({
      where,
      data: {
        status:
          input.decision === "accept"
            ? InviteStatus.CONFIRMED
            : InviteStatus.DECLINED,
      },
    });
    // Show the fresh state in any case: if nothing changed, the page was old.
    refresh();
    return count === 0
      ? { ok: false, error: TURN_TAKEN }
      : { ok: true, turnToken: null };
  }

  // A new suggestion: check it like any other suggestion.
  const proposedTime = input.proposedTime ?? "";
  const proposedPlace = (input.proposedPlace ?? "").trim();
  if (!isZonedTime(proposedTime)) {
    return { ok: false, error: "Pick a real date and time" };
  }
  if (new Date(proposedTime) < new Date()) {
    return { ok: false, error: "The time cannot be in the past" };
  }
  if (proposedPlace === "") {
    return { ok: false, error: "Add a place" };
  }
  if (proposedPlace.length > PLACE_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep the place under ${PLACE_NAME_MAX_LENGTH} characters`,
    };
  }

  const newTime = new Date(proposedTime);

  // The author's turn link stays the same when the author moves (it is
  // their door). A new guest move gives the author a fresh link.
  const newTurnToken = actor === Party.GUEST ? createToken() : null;

  // Two writes (the invite and its answer) that must happen together,
  // so they run in one transaction: both, or none.
  const invite = await prisma.$transaction(async (tx) => {
    const target = await tx.invite.findFirst({
      where,
      select: {
        id: true,
        timeOptions: { select: { id: true, startsAt: true } },
        placeOptions: { select: { id: true, name: true } },
        response: {
          select: {
            proposedTime: true,
            proposedPlace: true,
            chosenTime: { select: { startsAt: true } },
            chosenPlace: { select: { name: true } },
          },
        },
      },
    });
    if (!target || !target.response) return null;

    // The same time and place as now is not a new suggestion:
    // for that there is "Accept".
    const current = target.response;
    const currentTime = current.proposedTime ?? current.chosenTime?.startsAt;
    const currentPlace = current.proposedPlace ?? current.chosenPlace?.name;
    if (
      currentTime?.getTime() === newTime.getTime() &&
      currentPlace?.toLowerCase() === proposedPlace.toLowerCase()
    ) {
      return "same" as const;
    }

    // One of the author's first options again? Then we link it, not copy
    // its text: the author's hint ("by the entrance") stays with the place.
    const timeOption = target.timeOptions.find(
      (option) => option.startsAt.getTime() === newTime.getTime(),
    );
    const placeOption = target.placeOptions.find(
      (option) => option.name.toLowerCase() === proposedPlace.toLowerCase(),
    );

    const { count } = await tx.invite.updateMany({
      where: { id: target.id, ...where },
      data: {
        lastProposedBy: actor,
        ...(newTurnToken ? { turnToken: newTurnToken } : {}),
      },
    });
    if (count === 0) return null;

    await tx.response.update({
      where: { inviteId: target.id },
      data: {
        proposedTime: timeOption ? null : newTime,
        proposedPlace: placeOption ? null : proposedPlace,
        chosenTime: timeOption
          ? { connect: { id: timeOption.id } }
          : { disconnect: true },
        chosenPlace: placeOption
          ? { connect: { id: placeOption.id } }
          : { disconnect: true },
      },
    });
    return target;
  });

  if (invite === "same") {
    return { ok: false, error: "Change the time or the place first" };
  }

  refresh();
  if (!invite) return { ok: false, error: TURN_TAKEN };
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
