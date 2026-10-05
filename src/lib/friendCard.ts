import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { InviteStatus } from "@/generated/prisma/enums";

// Preview text for the friend's link: calm, no emoji.
export type FriendCard = {
  tag: string;
  title: string;
  subtitle: string;
};

// cache(): one database query per request for the <meta> tags and the picture.
// Time is shown only when the link carries ?tz=; the server knows no zone.
export const getFriendCard = cache(
  async (
    friendToken: string,
    timeZone: string | null,
  ): Promise<FriendCard | null> => {
    // Only what the preview shows: no tokens, no messages.
    const invite = await prisma.invite.findUnique({
      where: { friendToken },
      select: {
        authorName: true,
        status: true,
        updatedAt: true,
        response: {
          select: {
            respondentName: true,
            proposedTime: true,
            proposedPlace: true,
            chosenTime: { select: { startsAt: true } },
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
      const time = response.proposedTime ?? response.chosenTime?.startsAt;
      const timeText = time ? formatInZone(time, timeZone) : null;
      const parts = [timeText, place].filter(Boolean);
      return {
        tag: `plan-${version}`,
        title: `Date plan: ${invite.authorName} and ${response.respondentName}`,
        subtitle: parts.length > 0 ? parts.join(" · ") : "Open to see the plan",
      };
    }
    return {
      tag: `open-${version}`,
      title: "Date plan",
      subtitle: "The date is not agreed yet",
    };
  },
);

// Formatted time in the zone, or null for a missing or invalid zone.
function formatInZone(time: Date, timeZone: string | null): string | null {
  if (!timeZone) return null;
  try {
    return time.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    });
  } catch {
    return null;
  }
}
