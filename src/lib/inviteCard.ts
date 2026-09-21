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

// The text of the preview card that a messenger shows under a link.
// Short on purpose: messengers cut long titles.
export type InviteCard = {
  // A short word for the state. It goes into the address of the picture,
  // so a messenger sees a new address and does not show the old one
  // from its memory.
  tag: string;
  emoji: string;
  title: string;
  subtitle: string;
  // The words under the title: the author's message on a fresh invitation,
  // later the latest words of the back-and-forth ("Max: Sushi then?").
  quote: string | null;
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

// The card follows the story of the date, so a new message with the same
// link shows the new state (see the decision about one link in CLAUDE.md).
export function getInviteCard(invite: CardInput): InviteCard {
  const format = DATE_FORMATS[invite.format];
  const author = invite.authorName;
  const guest = invite.response?.respondentName;
  // The latest words of the talk, with the name of who wrote them.
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
  // Two moves of the same person give the same state, but new words.
  // The time of the last change makes the picture address new each time.
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
  // Who made the latest suggestion: the other person answers it.
  // Old invitations have no value: then it was the guest.
  const byAuthor = invite.lastProposedBy === Party.AUTHOR;

  if (invite.status === InviteStatus.COUNTER && guest) {
    return {
      // The proposer is in the tag too: a new move needs a new picture.
      tag: `${byAuthor ? "counter-author" : "counter"}-${version}`,
      emoji: "📨",
      title: `${byAuthor ? author : guest} suggested another option`,
      subtitle: `Waiting for ${byAuthor ? guest : author} to answer`,
      quote: talkQuote,
    };
  }
  if (invite.status === InviteStatus.DECLINED && guest) {
    // Who said no: the guest to the invitation, or whoever answered
    // the latest suggestion (the one who did not make it).
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
