import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  InviteStatus,
  Party,
  ResponseType,
  type DateFormat,
} from "@/generated/prisma/enums";
import { DATE_FORMATS } from "@/lib/dateFormats";
import { getLastWords } from "@/lib/responseView";

export type InviteCard = {
  // Goes into the picture address so messengers do not show a cached image.
  tag: string;
  emoji: string;
  title: string;
  subtitle: string;
  quote: string | null;
};

// cache(): one database query per request.
export const getInviteForCard = cache(async (publicToken: string) => {
  return prisma.invite.findUnique({
    where: { publicToken },
    select: {
      authorName: true,
      message: true,
      format: true,
      status: true,
      expiresAt: true,
      lastProposedBy: true,
      turnMessage: true,
      lastMessageBy: true,
      updatedAt: true,
      response: {
        select: { type: true, respondentName: true, message: true },
      },
    },
  });
});

type CardInput = {
  authorName: string;
  message: string;
  format: DateFormat;
  status: InviteStatus;
  expiresAt: Date;
  lastProposedBy: Party | null;
  turnMessage: string | null;
  lastMessageBy: Party | null;
  updatedAt: Date;
  response: {
    type: ResponseType;
    respondentName: string;
    message: string | null;
  } | null;
};

const MAX_QUOTE_LENGTH = 90;

function shorten(text: string): string {
  return text.length > MAX_QUOTE_LENGTH
    ? `${text.slice(0, MAX_QUOTE_LENGTH - 1)}…`
    : text;
}

export function getInviteCard(invite: CardInput): InviteCard {
  const format = DATE_FORMATS[invite.format];
  const author = invite.authorName;
  const guest = invite.response?.respondentName;
  const words = invite.response
    ? getLastWords(
        invite.lastMessageBy,
        invite.turnMessage,
        invite.response.message,
      )
    : null;
  const talkQuote = words
    ? shorten(`${words.by === "author" ? author : guest}: ${words.text}`)
    : null;
  // The last-change time makes the picture address new on each move.
  const version = invite.updatedAt.getTime().toString(36);

  if (invite.status === InviteStatus.CANCELLED) {
    return {
      tag: "cancelled",
      emoji: "🌷",
      title: "This date was cancelled",
      subtitle: `${author} cancelled the plan`,
      quote: null,
    };
  }
  if (invite.status === InviteStatus.CONFIRMED && guest) {
    return {
      tag: `yes-${version}`,
      emoji: "🎉",
      title: "It's a date!",
      subtitle: `${author} and ${guest} have a plan`,
      quote: talkQuote,
    };
  }
  // Old invitations have no value: the guest made it.
  const byAuthor = invite.lastProposedBy === Party.AUTHOR;

  if (invite.status === InviteStatus.COUNTER && guest) {
    return {
      // The proposer is in the tag too, so a new move gets a new picture.
      tag: `${byAuthor ? "counter-author" : "counter"}-${version}`,
      emoji: "📨",
      title: `${byAuthor ? author : guest} suggested another option`,
      subtitle: `Waiting for ${byAuthor ? guest : author} to answer`,
      quote: talkQuote,
    };
  }
  if (invite.status === InviteStatus.DECLINED && guest) {
    const byGuest = invite.response?.type === ResponseType.NO || byAuthor;
    return {
      tag: `no-${version}`,
      emoji: "🌷",
      title: "Not this time",
      subtitle: byGuest ? `${guest} can't make it` : `${author} can't make it`,
      quote: talkQuote,
    };
  }
  if (invite.expiresAt < new Date()) {
    return {
      tag: "expired",
      emoji: "⌛",
      title: "This invitation has expired",
      subtitle: `${author} can send a new one`,
      quote: null,
    };
  }

  const message = invite.message.trim();
  return {
    tag: "new",
    emoji: format.emoji,
    title: `${author} ${format.invitePhrase}`,
    subtitle: "Pick a time and a place",
    quote: shorten(message),
  };
}
