import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  InviteStatus,
  ResponseType,
  type DateFormat,
} from "@/generated/prisma/enums";
import { DATE_FORMATS } from "@/lib/dateFormats";

// The text of the preview card that a messenger shows under a link.
// Short on purpose: messengers cut long titles.
export type InviteCard = {
  emoji: string;
  title: string;
  subtitle: string;
  quote: string | null; // the author's message, only on a fresh invitation
};

// The same data is needed twice for one link: for the <meta> tags and
// for the picture. cache() keeps the result for one request, so the
// database is asked once.
export const getInviteForCard = cache(async (publicToken: string) => {
  return prisma.invite.findUnique({
    where: { publicToken },
    select: {
      authorName: true,
      message: true,
      format: true,
      status: true,
      expiresAt: true,
      response: { select: { type: true, respondentName: true } },
    },
  });
});

type CardInput = {
  authorName: string;
  message: string;
  format: DateFormat;
  status: InviteStatus;
  expiresAt: Date;
  response: { type: ResponseType; respondentName: string } | null;
};

const MAX_QUOTE_LENGTH = 90;

// The card follows the story of the date, so a new message with the same
// link shows the new state (see the decision about one link in CLAUDE.md).
export function getInviteCard(invite: CardInput): InviteCard {
  const format = DATE_FORMATS[invite.format];
  const author = invite.authorName;
  const guest = invite.response?.respondentName;

  if (invite.status === InviteStatus.CANCELLED) {
    return {
      emoji: "🌷",
      title: "This date was cancelled",
      subtitle: `${author} cancelled the plan`,
      quote: null,
    };
  }
  if (invite.status === InviteStatus.CONFIRMED && guest) {
    return {
      emoji: "🎉",
      title: "It's a date!",
      subtitle: `${author} and ${guest} have a plan`,
      quote: null,
    };
  }
  if (invite.status === InviteStatus.COUNTER && guest) {
    return {
      emoji: "📨",
      title: `${guest} suggested another option`,
      subtitle: `Waiting for ${author} to answer`,
      quote: null,
    };
  }
  if (invite.status === InviteStatus.DECLINED && guest) {
    // Both "no" from the guest and "no" from the author end here.
    const byGuest = invite.response?.type === ResponseType.NO;
    return {
      emoji: "🌷",
      title: "Not this time",
      subtitle: byGuest
        ? `${guest} can't make it`
        : `${author} can't make it`,
      quote: null,
    };
  }
  if (invite.expiresAt < new Date()) {
    return {
      emoji: "⌛",
      title: "This invitation has expired",
      subtitle: `${author} can send a new one`,
      quote: null,
    };
  }

  const message = invite.message.trim();
  return {
    emoji: format.emoji,
    title: `${author} ${format.invitePhrase}`,
    subtitle: "Pick a time and a place",
    quote:
      message.length > MAX_QUOTE_LENGTH
        ? `${message.slice(0, MAX_QUOTE_LENGTH - 1)}…`
        : message,
  };
}
