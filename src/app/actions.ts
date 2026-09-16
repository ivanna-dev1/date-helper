"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/tokens";
import {
  validateInvite,
  type CreateInviteInput,
  type InviteErrors,
} from "@/lib/inviteRules";
import {
  validateResponse,
  type ResponseErrors,
  type SubmitResponseInput,
} from "@/lib/responseRules";
import { InviteStatus, ResponseType } from "@/generated/prisma/enums";
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
export type SubmitResponseResult =
  | { ok: true }
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

  return { ok: true };
}

// Two shapes of result: done, or a message for the author.
export type AnswerSuggestionResult = { ok: true } | { ok: false; error: string };

// The author accepts or declines the invited person's suggestion.
// The secret token is the only key: whoever has it is the author.
export async function answerSuggestion(
  secretToken: string,
  accept: boolean,
): Promise<AnswerSuggestionResult> {
  // One conditional update instead of "read, check, then write".
  // The row changes only if it still waits for the author's decision.
  // If the author clicks on two devices at the same moment, only the
  // first click finds status COUNTER; the second one changes nothing.
  const { count } = await prisma.invite.updateMany({
    where: { secretToken, status: InviteStatus.COUNTER },
    data: {
      status: accept ? InviteStatus.CONFIRMED : InviteStatus.DECLINED,
    },
  });

  // Ask Next.js to render the page again with the fresh status.
  // Also when nothing changed: then the page was old, and the author
  // should see the decision that is already saved.
  refresh();

  if (count === 0) {
    return {
      ok: false,
      error: "This suggestion already has your answer",
    };
  }

  return { ok: true };
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
