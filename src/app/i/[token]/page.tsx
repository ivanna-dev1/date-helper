import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InviteResponseForm } from "@/components/InviteResponseForm";
import { ResponseSummary } from "@/components/ResponseSummary";
import { AuthorPageLink } from "@/components/AuthorPageLink";
import { InviteStatus } from "@/generated/prisma/enums";
import { DATE_FORMATS } from "@/lib/dateFormats";
import { getInviteCard, getInviteForCard } from "@/lib/inviteCard";
import { getBrowserRole } from "@/lib/browserRole";
import {
  getLastWords,
  RESPONSE_VIEW_SELECT,
  TURN_OPTIONS_SELECT,
  toSentAnswer,
} from "@/lib/responseView";

export async function generateMetadata(
  props: PageProps<"/i/[token]">,
): Promise<Metadata> {
  const { token } = await props.params;
  const invite = await getInviteForCard(token);
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
      // The tag changes with the state, so messengers do not keep an old picture.
      images: card
        ? [
            {
              url: `/i/${token}/opengraph-image?state=${card.tag}`,
              width: 1200,
              height: 630,
              alt: "An invitation from Date Helper",
            },
          ]
        : undefined,
    },
    // The link works like a password: keep it out of search engines.
    robots: { index: false, follow: false },
  };
}

export default async function InvitePage(props: PageProps<"/i/[token]">) {
  const { token } = await props.params;

  // `select`, not `include`: this page must never load secretToken.
  const invite = await prisma.invite.findUnique({
    where: { publicToken: token },
    select: {
      authorName: true,
      whoPays: true,
      friendToken: true,
      turnToken: true,
      lastProposedBy: true,
      turnMessage: true,
      lastMessageBy: true,
      message: true,
      format: true,
      expiresAt: true,
      status: true,
      updatedAt: true,
      timeOptions: {
        select: { id: true, startsAt: true },
        orderBy: { startsAt: "asc" },
      },
      placeOptions: {
        select: { id: true, name: true, note: true, photoUrl: true },
        orderBy: { id: "asc" },
      },
      response: { select: RESPONSE_VIEW_SELECT },
      ...TURN_OPTIONS_SELECT,
    },
  });

  if (!invite) {
    notFound();
  }

  const formatInfo = DATE_FORMATS[invite.format];

  const authorLink = <AuthorPageLink publicToken={token} />;

  const header = (
    <>
      <h1 className="text-center text-2xl font-bold text-ink">
        {invite.authorName} {formatInfo.invitePhrase}
        {" "}
        <span aria-hidden="true">{formatInfo.emoji}</span>
      </h1>

      <p className="rounded-xl border-l-4 border-brand bg-surface p-4 text-base text-ink">
        {invite.message}
      </p>
    </>
  );

  // Cancelled comes first: it ends the story whatever was answered.
  if (invite.status === InviteStatus.CANCELLED) {
    return (
      <main className="flex flex-1 flex-col gap-6 py-10">
        {header}
        <section className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-5 py-8 text-center">
          <h2 className="text-2xl font-bold text-ink">
            {invite.authorName} cancelled this date{" "}
            <span aria-hidden="true">🌷</span>
          </h2>
          <p className="text-base text-muted">Maybe another time.</p>
        </section>

        {authorLink}
      </main>
    );
  }

  // An existing answer is checked before expiry: the deadline is only for answering.
  const { response } = invite;
  if (response) {
    return (
      <main className="flex flex-1 flex-col gap-6 py-10">
        {header}
        <ResponseSummary
          answer={toSentAnswer(
            response,
            invite.status,
            invite.lastProposedBy,
            invite,
          )}
          authorName={invite.authorName}
          whoPays={invite.whoPays}
          friendToken={invite.friendToken}
          token={token}
          guestName={response.respondentName}
          lastWords={getLastWords(
            invite.lastMessageBy,
            invite.turnMessage,
            response.message,
          )}
          turnToken={invite.turnToken}
          shareVersion={invite.updatedAt.getTime().toString(36)}
          isAuthorBrowser={(await getBrowserRole(token)) === "author"}
        />

        {authorLink}
      </main>
    );
  }

  // The link is real, so say the time is over instead of "not found".
  if (invite.expiresAt < new Date()) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">
          This invitation has expired <span aria-hidden="true">⌛</span>
        </h1>
        <p className="text-base text-muted">
          {invite.authorName} can send you a new one.
        </p>

        {authorLink}
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 py-10">
      {header}

      <InviteResponseForm
        token={token}
        authorName={invite.authorName}
        whoPays={invite.whoPays}
        friendToken={invite.friendToken}
        times={invite.timeOptions.map((time) => ({
          id: time.id,
          startsAt: time.startsAt.toISOString(),
        }))}
        places={invite.placeOptions}
      />

      {authorLink}
    </main>
  );
}
