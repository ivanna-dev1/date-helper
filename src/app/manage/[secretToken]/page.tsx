import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ShareMenu } from "@/components/ShareMenu";
import { LocalDateTime } from "@/components/LocalDateTime";
import { AuthorAnswer } from "@/components/AuthorAnswer";
import { CancelInvite } from "@/components/CancelInvite";
import { RememberInvite } from "@/components/RememberInvite";
import { InviteStatus } from "@/generated/prisma/enums";
import { DATE_FORMATS } from "@/lib/dateFormats";
import {
  getLastWords,
  RESPONSE_VIEW_SELECT,
  TURN_OPTIONS_SELECT,
  toSentAnswer,
} from "@/lib/responseView";

export const metadata: Metadata = {
  title: "Your invitation — Date Helper",
  // Private page: keep it out of search engines.
  robots: { index: false, follow: false },
};

export default async function ManagePage(
  props: PageProps<"/manage/[secretToken]">,
) {
  const { secretToken } = await props.params;

  const invite = await prisma.invite.findUnique({
    where: { secretToken },
    select: {
      authorName: true,
      whoPays: true,
      friendToken: true,
      publicToken: true,
      format: true,
      expiresAt: true,
      status: true,
      updatedAt: true,
      lastProposedBy: true,
      turnMessage: true,
      lastMessageBy: true,
      response: { select: RESPONSE_VIEW_SELECT },
      ...TURN_OPTIONS_SELECT,
    },
  });

  if (!invite) {
    notFound();
  }

  const formatInfo = DATE_FORMATS[invite.format];

  // Remember the secret link in this browser.
  const remember = (
    <RememberInvite
      publicToken={invite.publicToken}
      secretToken={secretToken}
    />
  );

  const { response } = invite;
  const publicPath = `/i/${invite.publicToken}`;

  if (invite.status === InviteStatus.CANCELLED) {
    const name = response?.respondentName;
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
        {remember}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-ink">
            Invitation cancelled{" "}
            <span aria-hidden="true">🌷</span>
          </h1>
          <p className="text-base text-muted">
            The link now says that the date is cancelled.
          </p>
        </div>
        {/* key: remounts the menu closed. */}
        <ShareMenu
          key="cancelled"
          path={publicPath}
          text="Sorry, I have to cancel our date 🌷"
          buttonLabel={name ? `Let ${name} know` : "Let them know"}
        />
        <Link href="/create" className="text-sm font-medium text-accent">
          Create a new invitation
        </Link>
      </main>
    );
  }

  const cancel = <CancelInvite secretToken={secretToken} />;

  // An answer given in time stays valid after the deadline.
  if (response) {
    return (
      <main className="flex flex-1 flex-col gap-6 py-10">
        {remember}
        <h1 className="text-center text-2xl font-bold text-ink">
          Your {formatInfo.label.toLowerCase()} invitation{" "}
          <span aria-hidden="true">{formatInfo.emoji}</span>
        </h1>
        <AuthorAnswer
          answer={toSentAnswer(
            response,
            invite.status,
            invite.lastProposedBy,
            invite,
          )}
          respondentName={response.respondentName}
          authorName={invite.authorName}
          whoPays={invite.whoPays}
          lastWords={getLastWords(
            invite.lastMessageBy,
            invite.turnMessage,
            response.message,
          )}
          turnKey={{ kind: "secret", token: secretToken }}
          friendToken={invite.friendToken}
          publicPath={publicPath}
          shareVersion={invite.updatedAt.getTime().toString(36)}
        />
        {(invite.status === InviteStatus.CONFIRMED ||
          invite.status === InviteStatus.COUNTER) &&
          cancel}
      </main>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        {remember}
        <h1 className="text-2xl font-bold text-ink">
          No answer this time{" "}
          <span aria-hidden="true">⌛</span>
        </h1>
        <p className="text-base text-muted">
          The invitation has expired. You can create a new one.
        </p>
        <Link
          href="/create"
          className="rounded-2xl bg-brand px-6 py-4 text-base font-semibold text-white"
        >
          Create a new invitation
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 py-10">
      {remember}
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold text-ink">
          Your invitation is ready{" "}
          <span aria-hidden="true">✨</span>
        </h1>
        <p className="text-base text-muted">
          Send this link to the person you are inviting.
        </p>
      </div>

      <ShareMenu
        path={publicPath}
        text={`I have an invitation for you ${formatInfo.emoji}`}
        buttonLabel="Send the invitation"
      />

      <section className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface px-5 py-6 text-center">
        <span aria-hidden="true" className="text-3xl">
          ⏳
        </span>
        <h2 className="text-lg font-semibold text-ink">
          Waiting for an answer
        </h2>
        <p className="text-sm text-muted">
          The link works until{" "}
          <LocalDateTime value={invite.expiresAt.toISOString()} />
        </p>
      </section>

      <p className="text-center text-xs text-quiet">
        Keep this page. You will see the answer here.
      </p>

      {cancel}
    </main>
  );
}
