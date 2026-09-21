import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AuthorAnswer } from "@/components/AuthorAnswer";
import { InviteStatus } from "@/generated/prisma/enums";
import { DATE_FORMATS } from "@/lib/dateFormats";
import { getInviteCard, getInviteForCard } from "@/lib/inviteCard";
import {
  getLastWords,
  RESPONSE_VIEW_SELECT,
  toSentAnswer,
} from "@/lib/responseView";

// The author's turn link, sent by the invited person after a suggestion.
// Whoever has it answers as the author: accept, decline, or suggest
// something else. It does not give the rest of the author's rights
// (cancelling stays on the author's own page).

async function findByTurn(turnToken: string) {
  return prisma.invite.findUnique({
    where: { turnToken },
    select: {
      authorName: true,
      whoPays: true,
      publicToken: true,
      friendToken: true,
      format: true,
      status: true,
      updatedAt: true,
      lastProposedBy: true,
      turnMessage: true,
      lastMessageBy: true,
      response: { select: RESPONSE_VIEW_SELECT },
    },
  });
}

// The messenger preview: the same card and picture as the invitation link,
// because both links are about the same date.
export async function generateMetadata(
  props: PageProps<"/d/[turnToken]">,
): Promise<Metadata> {
  const { turnToken } = await props.params;
  const found = await findByTurn(turnToken);
  const invite = found ? await getInviteForCard(found.publicToken) : null;
  const card = invite ? getInviteCard(invite) : null;
  const title = card ? `${card.title} ${card.emoji}` : "Date Helper";
  const description = card?.subtitle ?? "Ask someone out, the easy way";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Date Helper",
      images:
        card && found
          ? [
              {
                url: `/i/${found.publicToken}/opengraph-image?state=${card.tag}`,
                width: 1200,
                height: 630,
                alt: "An invitation from Date Helper",
              },
            ]
          : undefined,
    },
    // The link works like a password. Search engines must not show it.
    robots: { index: false, follow: false },
  };
}

export default async function TurnPage(props: PageProps<"/d/[turnToken]">) {
  const { turnToken } = await props.params;
  const invite = await findByTurn(turnToken);

  // No such link: it never existed, or a newer suggestion replaced it.
  if (!invite || !invite.response) {
    notFound();
  }

  const formatInfo = DATE_FORMATS[invite.format];
  const { response } = invite;

  if (invite.status === InviteStatus.CANCELLED) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">
          This date was cancelled{" "}
          <span aria-hidden="true">🌷</span>
        </h1>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 py-10">
      <h1 className="text-center text-2xl font-bold text-ink">
        Your {formatInfo.label.toLowerCase()} invitation{" "}
        <span aria-hidden="true">{formatInfo.emoji}</span>
      </h1>
      <AuthorAnswer
        answer={toSentAnswer(response, invite.status, invite.lastProposedBy)}
        respondentName={response.respondentName}
        authorName={invite.authorName}
        whoPays={invite.whoPays}
        lastWords={getLastWords(
          invite.lastMessageBy,
          invite.turnMessage,
          response.message,
        )}
        turnKey={{ kind: "turn", token: turnToken }}
        friendToken={invite.friendToken}
        publicPath={`/i/${invite.publicToken}`}
        shareVersion={invite.updatedAt.getTime().toString(36)}
      />
    </main>
  );
}
