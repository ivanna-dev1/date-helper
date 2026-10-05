import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InviteStatus } from "@/generated/prisma/enums";
import { LocalDateTime } from "@/components/LocalDateTime";
import { RESPONSE_VIEW_SELECT, toSentAnswer } from "@/lib/responseView";
import { getFriendCard } from "@/lib/friendCard";

// The server knows no time zone, so the link carries the sender's (?tz=); without it the time is left out.
export async function generateMetadata(
  props: PageProps<"/f/[friendToken]">,
): Promise<Metadata> {
  const { friendToken } = await props.params;
  const { tz } = await props.searchParams;
  const timeZone = typeof tz === "string" ? tz : null;
  const card = await getFriendCard(friendToken, timeZone);
  const title = card?.title ?? "Date plan";
  const description = card?.subtitle ?? "Open to see the plan";

  return {
    title: `${title} — Date Helper`,
    description,
    openGraph: {
      title,
      description,
      siteName: "Date Helper",
      // A new tag makes messengers refresh the picture.
      images: card
        ? [
            {
              url: `/f/${friendToken}/card?state=${card.tag}${
                timeZone ? `&tz=${encodeURIComponent(timeZone)}` : ""
              }`,
              width: 1200,
              height: 630,
              alt: "A date plan from Date Helper",
            },
          ]
        : undefined,
    },
    // Keep out of search engines.
    robots: { index: false, follow: false },
  };
}

const labelStyle = "text-xs font-medium uppercase tracking-wide text-muted";

// Read-only, neutral page. Always shows the current state.
export default async function FriendPage(props: PageProps<"/f/[friendToken]">) {
  const { friendToken } = await props.params;

  const invite = await prisma.invite.findUnique({
    where: { friendToken },
    select: {
      authorName: true,
      status: true,
      response: { select: RESPONSE_VIEW_SELECT },
    },
  });

  if (!invite) {
    notFound();
  }

  const { response } = invite;
  const isAgreed = invite.status === InviteStatus.CONFIRMED && response;

  return (
    <main className="flex flex-1 flex-col gap-6 py-10">
      <h1 className="text-center text-2xl font-bold text-ink">Date plan</h1>

      <section className="animate-card-in flex flex-col gap-5 rounded-2xl border border-line bg-surface px-5 py-6">
        {invite.status === InviteStatus.CANCELLED && (
          <p className="text-base text-ink">This date was cancelled.</p>
        )}

        {!isAgreed && invite.status !== InviteStatus.CANCELLED && (
          <p className="text-base text-ink">The date is not agreed yet.</p>
        )}

        {isAgreed && (
          <PlanDetails
            names={`${invite.authorName} and ${response.respondentName}`}
            answer={toSentAnswer(response, invite.status)}
          />
        )}
      </section>

      <p className="text-center text-xs text-quiet">
        This page always shows the latest plan. If the date changes or is
        cancelled, you will see it here.
      </p>
    </main>
  );
}

function PlanDetails({
  names,
  answer,
}: {
  names: string;
  answer: ReturnType<typeof toSentAnswer>;
}) {
  return (
    <dl className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <dt className={labelStyle}>Who</dt>
        <dd className="text-base font-semibold text-ink">{names}</dd>
      </div>
      {answer.time && (
        <div className="flex flex-col gap-1">
          <dt className={labelStyle}>When</dt>
          <dd className="text-base font-semibold text-ink">
            <LocalDateTime value={answer.time} format="long" />
          </dd>
        </div>
      )}
      {answer.place && (
        <div className="flex flex-col gap-1">
          <dt className={labelStyle}>Where</dt>
          <dd className="text-base font-semibold text-ink">
            {answer.place}
            {answer.placeNote && (
              <span className="block text-sm font-normal text-muted">
                {answer.placeNote}
              </span>
            )}
          </dd>
        </div>
      )}
    </dl>
  );
}
