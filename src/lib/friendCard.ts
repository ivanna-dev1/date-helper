import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { InviteStatus } from "@/generated/prisma/enums";

// The text of the preview for the friend's link. Calm, like the page:
// no emoji, no playful words. No time: see the note in the page file.
export type FriendCard = {
  tag: string; // goes into the picture address, changes with the plan
  title: string;
  subtitle: string;
};

// Needed twice for one link (the <meta> tags and the picture):
// cache() asks the database once per request.
export const getFriendCard = cache(
  async (friendToken: string): Promise<FriendCard | null> => {
    // Only what the preview shows. No tokens, no messages.
    const invite = await prisma.invite.findUnique({
      where: { friendToken },
      select: {
        authorName: true,
        status: true,
        updatedAt: true,
        response: {
          select: {
            respondentName: true,
            proposedPlace: true,
            chosenPlace: { select: { name: true } },
          },
        },
      },
    });
    if (!invite) return null;

    const version = invite.updatedAt.getTime().toString(36);
    const { response } = invite;

    if (invite.status === InviteStatus.CANCELLED) {
      return {
        tag: `cancelled-${version}`,
        title: "Date plan",
        subtitle: "This date was cancelled",
      };
    }
    if (invite.status === InviteStatus.CONFIRMED && response) {
      const place = response.proposedPlace ?? response.chosenPlace?.name;
      return {
        tag: `plan-${version}`,
        title: `Date plan: ${invite.authorName} and ${response.respondentName}`,
        subtitle: place
          ? `At ${place}. Open to see the time`
          : "Open to see the time and place",
      };
    }
    return {
      tag: `open-${version}`,
      title: "Date plan",
      subtitle: "The date is not agreed yet",
    };
  },
);
