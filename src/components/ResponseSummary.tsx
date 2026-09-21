import type { WhoPays } from "@/generated/prisma/enums";
import { AnswerDetails } from "@/components/AnswerDetails";
import { DatePlan } from "@/components/DatePlan";
import { getWhoPaysText } from "@/lib/whoPays";
import { ShareMenu } from "@/components/ShareMenu";
import { TurnDecision } from "@/components/TurnDecision";
import { LastMessage } from "@/components/LastMessage";
import type { AnswerOutcome, LastWords, SentAnswer } from "@/lib/responseView";

// The screen the invited person sees after answering.
// It is shown right after sending (data from the form)
// and later, when the link is opened again (data from the database).

type ResponseSummaryProps = {
  answer: SentAnswer;
  authorName: string;
  whoPays: WhoPays | null;
  friendToken: string; // for "Let a friend know where I am"
  token: string; // the invitation's public token, from "/i/k7Fq2mXp9RtA"
  guestName: string; // this person's own name, for "You" and "Max"
  lastWords: LastWords | null; // the latest few words of the back-and-forth
  // The author's turn link. The invited person sends it after a suggestion,
  // so the author can answer from it. Empty before any suggestion.
  turnToken: string | null;
  // true right after sending. false when the link is opened again:
  // then the author has most likely been told already.
  isJustSent: boolean;
  // Changes with every move (made from the time of the last change).
  // It goes into the shared address, so a messenger makes a fresh preview
  // for every move and does not show the old one from its memory.
  shareVersion?: string;
};

// Emoji and heading for each outcome. No hearts: a first date is often
// closer to a friendly meeting. `byGuest` tells who made the latest
// suggestion.
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

// What the invited person sends to the author, and by which link.
// After a suggestion the link is the author's turn link, so the author
// can answer from it; otherwise the author gets the invitation link.
function getShare(
  outcome: AnswerOutcome,
  byGuest: boolean,
  isJustSent: boolean,
): { text: string; toTurnLink: boolean } | null {
  // A suggestion waits for the author: the link stays useful, so the button
  // stays too, also when the page is opened again.
  if (outcome === "suggested") {
    return {
      text: "I suggested another option for our date 📨",
      toTurnLink: true,
    };
  }
  // The invited person answered the author's suggestion.
  if (!byGuest && outcome === "suggestionAccepted") {
    return { text: "I said yes to your suggestion! 🎉", toTurnLink: true };
  }
  if (!byGuest && outcome === "suggestionDeclined") {
    return {
      text: "Sorry, your suggestion doesn't work for me 🌷",
      toTurnLink: true,
    };
  }
  // The first answer: only right after sending. Later the author knows.
  if (isJustSent && outcome === "yes") {
    return { text: "I said yes to your invitation! 🎉", toTurnLink: false };
  }
  if (isJustSent && outcome === "no") {
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
  isJustSent,
  shareVersion,
}: ResponseSummaryProps) {
  const whoPaysText = getWhoPaysText(whoPays, authorName, guestName, "guest");
  const { outcome } = answer;
  const byGuest = answer.proposedBy === "guest";
  const heading = HEADINGS[outcome];
  const path = `/i/${token}`;
  const share = getShare(outcome, byGuest, isJustSent);
  // The date is agreed: show the shared plan instead of the answer details.
  const isAgreed = outcome === "yes" || outcome === "suggestionAccepted";

  // The tag changes the address, so the messenger loads a fresh preview
  // instead of the one it remembered for this link.
  const tag = shareVersion ? `${outcome}-${shareVersion}` : outcome;
  const sharePath = `${
    share?.toTurnLink && turnToken ? `/d/${turnToken}` : path
  }?s=${tag}`;
  const shareMenu = share ? (
    <ShareMenu
      path={sharePath}
      text={share.text}
      buttonLabel={`Let ${authorName} know`}
      hint={isJustSent ? `${authorName} doesn't know yet` : undefined}
    />
  ) : null;

  return (
    <section className="flex flex-col items-center gap-6 rounded-2xl border border-line bg-surface px-5 py-8 text-center">
      <h2 className="text-2xl font-bold text-ink">
        {heading.title(authorName, byGuest)}
        {/* The emoji ends the heading line. A non-breaking space keeps it
            next to the last word. aria-hidden: it is only decoration. */}
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

      {/* The latest words go before the buttons, so they are read first. */}
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
          // The author gets no message from us, so telling them is the
          // first button under the plan.
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
        <AnswerDetails answer={answer} ownNote="" whoPaysText={whoPaysText} />
      )}

      {!isAgreed && (
        <LastMessage
          words={lastWords}
          viewer="guest"
          authorName={authorName}
          guestName={guestName}
        />
      )}

      {/* The author suggested something back: now this person decides. */}
      {outcome === "authorSuggested" && (
        <TurnDecision
          turnKey={{ kind: "public", token }}
          viewer="guest"
          currentTime={answer.time}
          currentPlace={answer.place}
          currentPlaceNote={answer.placeNote}
          currentWhoPays={whoPays}
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
