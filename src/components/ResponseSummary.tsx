import type { WhoPays } from "@/generated/prisma/enums";
import { AnswerDetails } from "@/components/AnswerDetails";
import { DatePlan } from "@/components/DatePlan";
import { getWhoPaysText } from "@/lib/whoPays";
import { ShareMenu } from "@/components/ShareMenu";
import { TurnDecision } from "@/components/TurnDecision";
import { LastMessage } from "@/components/LastMessage";
import type { AnswerOutcome, LastWords, SentAnswer } from "@/lib/responseView";


type ResponseSummaryProps = {
  answer: SentAnswer;
  authorName: string;
  whoPays: WhoPays | null;
  friendToken: string;
  token: string;
  guestName: string;
  lastWords: LastWords | null;
  turnToken: string | null;
  shareVersion?: string;
  isAuthorBrowser?: boolean;
};

const HEADINGS: Record<
  AnswerOutcome,
  { emoji: string; title: (authorName: string, byGuest: boolean) => string }
> = {
  yes: { emoji: "🎉", title: () => "It's a date!" },
  suggested: { emoji: "📨", title: () => "Your suggestion is sent" },
  authorSuggested: {
    emoji: "📨",
    title: (authorName) => `${authorName} suggested another option`,
  },
  no: {
    emoji: "🌷",
    title: (authorName) => `Thanks for letting ${authorName} know`,
  },
  suggestionAccepted: { emoji: "🎉", title: () => "It's a date!" },
  suggestionDeclined: {
    emoji: "🌷",
    title: (authorName, byGuest) =>
      byGuest
        ? `${authorName} can't make it this time`
        : `You declined ${authorName}'s suggestion`,
  },
};

function getShare(
  outcome: AnswerOutcome,
  byGuest: boolean,
): { text: string; toTurnLink: boolean } | null {
  if (outcome === "suggested") {
    return {
      text: "I suggested another option for our date 📨",
      toTurnLink: true,
    };
  }
  if (!byGuest && outcome === "suggestionAccepted") {
    return { text: "I said yes to your suggestion! 🎉", toTurnLink: true };
  }
  if (!byGuest && outcome === "suggestionDeclined") {
    return {
      text: "Sorry, your suggestion doesn't work for me 🌷",
      toTurnLink: true,
    };
  }
  // Also on reopen: saving sets the role cookie and the server redraws, so "just sent" is lost.
  if (outcome === "yes") {
    return { text: "I said yes to your invitation! 🎉", toTurnLink: false };
  }
  if (outcome === "no") {
    return { text: "I answered your invitation 🌷", toTurnLink: false };
  }
  return null;
}

export function ResponseSummary({
  answer,
  authorName,
  whoPays,
  friendToken,
  token,
  guestName,
  lastWords,
  turnToken,
  shareVersion,
  isAuthorBrowser = false,
}: ResponseSummaryProps) {
  const whoPaysText = getWhoPaysText(whoPays, authorName, guestName, "guest");
  const { outcome } = answer;
  const byGuest = answer.proposedBy === "guest";
  const heading = HEADINGS[outcome];
  const path = `/i/${token}`;
  const share = getShare(outcome, byGuest);
  const isAgreed = outcome === "yes" || outcome === "suggestionAccepted";

  // The tag changes the URL so messengers refetch the preview.
  const tag = shareVersion ? `${outcome}-${shareVersion}` : outcome;
  const sharePath = `${
    share?.toTurnLink && turnToken ? `/d/${turnToken}` : path
  }?s=${tag}`;
  const shareMenu = share ? (
    <ShareMenu
      path={sharePath}
      text={share.text}
      buttonLabel={`Let ${authorName} know`}
      hint={`${authorName} doesn't know yet`}
    />
  ) : null;

  return (
    <section className="animate-card-in flex flex-col items-center gap-6 rounded-2xl border border-line bg-surface px-5 py-8 text-center">
      <h2 className="text-2xl font-bold text-ink">
        {heading.title(authorName, byGuest)}
        {" "}
        <span aria-hidden="true">{heading.emoji}</span>
      </h2>

      {outcome === "suggestionAccepted" && (
        <p className="-mt-3 text-sm text-muted">
          {byGuest
            ? `${authorName} accepted your suggestion.`
            : `You accepted ${authorName}'s suggestion.`}
        </p>
      )}

      {isAgreed && (
        <LastMessage
          words={lastWords}
          viewer="guest"
          authorName={authorName}
          guestName={guestName}
        />
      )}

      {isAgreed && (
        <DatePlan
          answer={answer}
          whoPaysText={whoPaysText}
          invitePath={path}
          friendPath={`/f/${friendToken}`}
          eventTitle={`Date with ${authorName}`}
          notifyButton={shareMenu}
        />
      )}

      {outcome === "suggested" && (
        <AnswerDetails
          answer={answer}
          ownNote="(your idea)"
          whoPaysText={whoPaysText}
        />
      )}
      {outcome === "authorSuggested" && (
        <AnswerDetails
          answer={answer}
          ownNote=""
          whoPaysText={whoPaysText}
          hideChoices
        />
      )}

      {!isAgreed && (
        <LastMessage
          words={lastWords}
          viewer="guest"
          authorName={authorName}
          guestName={guestName}
        />
      )}

      {outcome === "authorSuggested" && isAuthorBrowser && (
        <p className="text-sm text-muted">
          This is your suggestion — send this link to {guestName}.
        </p>
      )}
      {outcome === "authorSuggested" && !isAuthorBrowser && (
        <TurnDecision
          turnKey={{ kind: "public", token }}
          viewer="guest"
          answer={answer}
          currentWhoPays={whoPays}
          otherName={authorName}
        />
      )}

      {!isAgreed && shareMenu}

      {outcome === "suggested" && (
        <p className="text-sm text-muted">
          {authorName} will answer from the link you send.
        </p>
      )}
    </section>
  );
}
