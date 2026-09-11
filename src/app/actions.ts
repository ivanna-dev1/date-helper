"use server";

import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/tokens";
import {
  validateInvite,
  type CreateInviteInput,
  type InviteErrors,
} from "@/lib/inviteRules";

// Two shapes of answer, and TypeScript makes us check `ok` before we read
// the rest. So we cannot use `secretToken` by mistake when it is not there.
export type CreateInviteResult =
  | { ok: true; secretToken: string }
  | { ok: false; errors: InviteErrors };

export async function createInvite(
  input: CreateInviteInput,
): Promise<CreateInviteResult> {
  const errors = validateInvite(input);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
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

  return { ok: true, secretToken: invite.secretToken };
}
