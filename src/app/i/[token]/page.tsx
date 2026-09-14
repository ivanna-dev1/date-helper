import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InviteChoices } from "@/components/InviteChoices";
import { DATE_FORMATS } from "@/lib/dateFormats";

export const metadata: Metadata = {
  title: "You are invited — Date Helper",
  // The link works like a password. Search engines must not show it.
  robots: { index: false, follow: false },
};

export default async function InvitePage(props: PageProps<"/i/[token]">) {
  const { token } = await props.params;

  // One call. The nested `select` loads the time and place rows together
  // with the invite. Prisma makes one query per table, not one per option,
  // so the number of queries does not grow with the number of options.
  // We use `select`, not `include`: `include` would also load secretToken
  // and friendToken, and this page must never have them.
  const invite = await prisma.invite.findUnique({
    where: { publicToken: token },
    select: {
      authorName: true,
      message: true,
      format: true,
      timeOptions: {
        select: { id: true, startsAt: true },
        orderBy: { startsAt: "asc" },
      },
      placeOptions: {
        select: { id: true, name: true, note: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!invite) {
    notFound();
  }

  const formatInfo = DATE_FORMATS[invite.format];

  return (
    <main className="flex flex-1 flex-col gap-6 py-10">
      {/* These parts never change, so they stay on the server. */}
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

      {/* The choosing part reacts to clicks, so it is a client component.
          We turn Date objects into strings before passing them down. */}
      <InviteChoices
        times={invite.timeOptions.map((time) => ({
          id: time.id,
          startsAt: time.startsAt.toISOString(),
        }))}
        places={invite.placeOptions}
      />
    </main>
  );
}
