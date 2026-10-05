import Link from "next/link";
import type { WhoPays } from "@/generated/prisma/enums";
import type { TurnKey } from "@/app/actions";
import { AnswerDetails } from "@/components/AnswerDetails";
import { DatePlan } from "@/components/DatePlan";
import { getWhoPaysText } from "@/lib/whoPays";
import { ShareMenu } from "@/components/ShareMenu";
import { TurnDecision } from "@/components/TurnDecision";
import { LastMessage } from "@/components/LastMessage";
import type { AnswerOutcome, LastWords, SentAnswer } from "@/lib/responseView";

type AuthorAnswerProps = {
  answer: SentAnswer;
  respondentName: string;
  authorName: string;
  whoPays: WhoPays | null;
  lastWords: LastWords | null;
  turnKey: TurnKey;
  friendToken: string;
  publicPath: string;
  // Changes each move so messengers refetch the preview.
  shareVersion: string;
  isGuestBrowser?: boolean;
};

const HEADINGS: Record<
  AnswerOutcome,
  { emoji: string; title: (name: string, byGuest: boolean) => string }
> = {
  yes: { emoji: "🎉", title: () => "It's a date!" },
  no: { emoji: "🌷", title: (name) => `${name} can't this time` },
  suggested: {
    emoji: "📨",
    title: (name) => `${name} suggested another option`,
  },
  authorSuggested: {
    emoji: "📨",
    title: () => "You suggested another option",
  },
  suggestionAccepted: { emoji: "🎉", title: () => "It's a date!" },
  suggestionDeclined: {
    emoji: "🌷",
    title: (name, byGuest) =>
      byGuest
        ? `You declined ${name}'s suggestion`
        : `${name} can't make it this time`,
  },
};

function getShareText(outcome: AnswerOutcome, byGuest: boolean) {
  if (outcome === "authorSuggested") {
    return "I suggested another option — what do you say? 📨";
  }
  if (!byGuest) return undefined;
  if (outcome === "suggestionAccepted") {
    return "I said yes to your suggestion! 🎉";
  }
  if (outcome === "suggestionDeclined") {
    return "Sorry, your suggestion doesn't work for me 🌷";
  }
  return undefined;
}

export function AuthorAnswer({
  answer,
  respondentName,
  authorName,
  whoPays,
  lastWords,
  turnKey,
  friendToken,
  publicPath,
  shareVersion,
  isGuestBrowser = false,
}: AuthorAnswerProps) {
  const { outcome } = answer;
  const byGuest = answer.proposedBy === "guest";
  const heading = HEADINGS[outcome];
  const shareText = getShareText(outcome, byGuest);
  const isNo = outcome === "no" || outcome === "suggestionDeclined";
  const whoPaysText = getWhoPaysText(
    whoPays,
    authorName,
    respondentName,
    "author",
  );
  const isAgreed = outcome === "yes" || outcome === "suggestionAccepted";

  // The tag changes the URL so messengers refetch the preview.
  const shareMenu = shareText ? (
    <ShareMenu
      path={`${publicPath}?s=${outcome}-${shareVersion}`}
      text={shareText}
      buttonLabel={`Let ${respondentName} know`}
      hint={`${respondentName} doesn't know yet`}
    />
  ) : null;

  return (
    <section className="animate-card-in flex flex-col items-center gap-6 rounded-2xl border border-line bg-surface px-5 py-8 text-center">
      <h2 className="text-2xl font-bold text-ink">
        {heading.title(respondentName, byGuest)}
        {" "}
        <span aria-hidden="true">{heading.emoji}</span>
      </h2>

      {outcome === "yes" && (
        <p className="-mt-3 text-sm text-muted">{respondentName} said yes.</p>
      )}
      {outcome === "suggestionAccepted" && (
        <p className="-mt-3 text-sm text-muted">
          {byGuest
            ? `You accepted ${respondentName}'s suggestion.`
            : `${respondentName} accepted your suggestion.`}
        </p>
      )}

      {isAgreed && (
        <LastMessage
          words={lastWords}
          viewer="author"
          authorName={authorName}
          guestName={respondentName}
        />
      )}

      {isAgreed && (
        <DatePlan
          answer={answer}
          whoPaysText={whoPaysText}
          invitePath={publicPath}
          friendPath={`/f/${friendToken}`}
          eventTitle={`Date with ${respondentName}`}
          notifyButton={shareMenu}
        />
      )}

      {outcome === "suggested" && (
        <AnswerDetails
          answer={answer}
          ownNote={`(${respondentName}'s idea)`}
          whoPaysText={whoPaysText}
          hideChoices
        />
      )}
      {outcome === "authorSuggested" && (
        <AnswerDetails answer={answer} ownNote="" whoPaysText={whoPaysText} />
      )}

      {!isAgreed && (
        <LastMessage
          words={lastWords}
          viewer="author"
          authorName={authorName}
          guestName={respondentName}
        />
      )}

      {outcome === "suggested" && isGuestBrowser && (
        <p className="text-sm text-muted">
          This is your suggestion — send this link to {authorName}.
        </p>
      )}
      {outcome === "suggested" && !isGuestBrowser && (
        <TurnDecision
          turnKey={turnKey}
          viewer="author"
          answer={answer}
          currentWhoPays={whoPays}
          otherName={respondentName}
        />
      )}

      {outcome === "authorSuggested" && (
        <p className="text-sm text-muted">
          Waiting for {respondentName} to answer.
        </p>
      )}

      {!isAgreed && shareMenu}

      {isNo && (
        <Link
          href="/create"
          className="rounded-2xl border border-line px-6 py-3 text-sm font-medium text-muted"
        >
          Create a new invitation
        </Link>
      )}
    </section>
  );
}
