import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { InviteStatus } from "@/generated/prisma/enums";

// The text of the preview for the friend's link. Calm, like the page:
// no emoji, no playful words.
export type FriendCard = {
  tag: string; // goes into the picture address, changes with the plan
  title: string;
  subtitle: string;
};

// Needed twice for one link (the <meta> tags and the picture):
// cache() asks the database once per request.
// The time is shown only when the link carries the sender's time zone
// ("?tz=Europe/Kyiv"): the server itself does not know any zone.
export const getFriendCard = cache(
  async (
    friendToken: string,
    timeZone: string | null,
  ): Promise<FriendCard | null> => {
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

// "Sat, Oct 10, 6:00 PM" in the given zone, or null when the zone is
// missing or not a real one (a link can be changed by hand).
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
