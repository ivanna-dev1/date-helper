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

// The title and description a messenger shows next to the picture.
// They follow the state of the date, like the picture does.
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
      // The tag in the address changes with the state of the date.
      // Without it a messenger keeps showing the first picture it saw.
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
    // The link works like a password. Search engines must not show it.
    robots: { index: false, follow: false },
  };
}

export default async function InvitePage(props: PageProps<"/i/[token]">) {
  const { token } = await props.params;

  // One call. The nested `select` loads the time and place rows together
  // with the invite. Prisma makes one query per table, not one per option,
  // so the number of queries does not grow with the number of options.
  // We use `select`, not `include`: `include` would also load secretToken,
  // and this page must never have it. friendToken is fine here: it only
  // opens a read-only page with the same details this person already sees.
  const invite = await prisma.invite.findUnique({
    where: { publicToken: token },
    select: {
      authorName: true,
      whoPays: true,
      friendToken: true,
      // The author's turn link: the invited person sends it after a
      // suggestion. Both fields are empty on old invitations.
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
        select: { id: true, name: true, note: true },
        orderBy: { id: "asc" },
      },
      // The answer, if there is one, with the picked time and place.
      // Still the same one call: Prisma joins these rows for us.
      response: { select: RESPONSE_VIEW_SELECT },
      ...TURN_OPTIONS_SELECT,
    },
  });

  if (!invite) {
    notFound();
  }

  const formatInfo = DATE_FORMATS[invite.format];

  // Shown only in the author's own browser: it remembers their link.
  const authorLink = <AuthorPageLink publicToken={token} />;

  // These parts never change, so they stay on the server.
  const header = (
    <>
      <h1 className="text-center text-2xl font-bold text-ink">
        {invite.authorName} {formatInfo.invitePhrase}
        {/* A non-breaking space keeps the emoji next to the last word,
            so it never moves to a new line alone. */}
        {" "}
        {/* aria-hidden: the emoji is decoration, the heading says the same. */}
        <span aria-hidden="true">{formatInfo.emoji}</span>
      </h1>

      <p className="rounded-xl border-l-4 border-brand bg-surface p-4 text-base text-ink">
        {invite.message}
      </p>
    </>
  );

  // Cancelled by the author: this goes first, because it ends the story
  // whatever was answered before.
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

  // One invitation gets one answer. If it is already there, the form would
  // only lead to an error, so we show the answer instead.
  // This check goes before the expiry check: the date is only a deadline
  // for answering. An answer given in time stays visible after it.
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
          isJustSent={false}
          shareVersion={invite.updatedAt.getTime().toString(36)}
          isAuthorBrowser={(await getBrowserRole(token)) === "author"}
        />

        {authorLink}
      </main>
    );
  }

  // The link is real, so "not found" would be a lie and would look like a
  // broken link. We say the truth: the time for this invitation is over.
  // Comparing two moments is safe on the server: a moment is the same in
  // every time zone. Only showing it as text depends on the zone.
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

      {/* The answer form reacts to clicks, so it is a client component.
          We turn Date objects into strings before passing them down. */}
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
