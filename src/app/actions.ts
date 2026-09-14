"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/tokens";
import {
  validateInvite,
  type CreateInviteInput,
  type InviteErrors,
} from "@/lib/inviteRules";

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
