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
  lastWords: LastWords | null; // the latest few words of the back-and-forth
  // The author's key for answering: the secret link or the turn link.
  turnKey: TurnKey;
  friendToken: string; // for "Let a friend know where I am"
  publicPath: string; // the invited person's link, "/i/k7Fq2mXp9RtA"
  // Changes with every move, so a messenger makes a fresh preview each time.
  shareVersion: string;
  // true when this browser is the invited person's: they opened the turn
  // link they sent. Then there are no answer buttons, only a hint.
  isGuestBrowser?: boolean;
};

// What the author sees for each outcome. No hearts, like elsewhere.
// `byGuest` tells who made the latest suggestion.
const HEADINGS: Record<
  AnswerOutcome,
  { emoji: string; title: (name: string, byGuest: boolean) => string }
> = {
  // An agreed date has the same heading for both people.
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

// The invited person does not know the author's move yet. The author tells
// them the same way: a message with the invited person's own link.
function getShareText(outcome: AnswerOutcome, byGuest: boolean) {
  if (outcome === "authorSuggested") {
    return "I suggested another option — what do you say? 📨";
  }
  // Only the author's own decision is news for the invited person.
  if (!byGuest) return undefined;
  if (outcome === "suggestionAccepted") {
    return "I said yes to your suggestion! 🎉";
  }
  if (outcome === "suggestionDeclined") {
    return "Sorry, your suggestion doesn't work for me 🌷";
  }
  return undefined;
}

// The answer, shown on the author's page (and on the author's turn link).
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

  // The tag changes the address, so the messenger loads a fresh preview
  // instead of the one it remembered for this link.
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
        {/* The emoji ends the heading line. A non-breaking space keeps it
            next to the last word. aria-hidden: it is only decoration. */}
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

      {/* The date is agreed: the same plan as the invited person sees. */}
      {/* The latest words go before the buttons, so they are read first. */}
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
          // The invited person does not know the decision yet,
          // so this button stands first under the plan.
          notifyButton={shareMenu}
        />
      )}

      {/* A suggestion on the table: who made it decides the note. */}
      {outcome === "suggested" && (
        <AnswerDetails
          answer={answer}
          ownNote={`(${respondentName}'s idea)`}
          whoPaysText={whoPaysText}
          // The choice cards below show the options.
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
