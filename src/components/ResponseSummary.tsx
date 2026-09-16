import { AnswerDetails } from "@/components/AnswerDetails";
import { ShareMenu } from "@/components/ShareMenu";
import type { AnswerOutcome, SentAnswer } from "@/lib/responseView";

// The screen the invited person sees after answering.
// It is shown right after sending (data from the form)
// and later, when the link is opened again (data from the database).

type ResponseSummaryProps = {
  answer: SentAnswer;
  authorName: string;
  path: string; // the invitation link, "/i/k7Fq2mXp9RtA"
  // true right after sending. false when the link is opened again:
  // then the author has most likely been told already.
  isJustSent: boolean;
};

// Emoji and heading for each outcome. No hearts: a first date is often
// closer to a friendly meeting. The title is a function, because some
// titles need the author's name.
const HEADINGS: Record<
  AnswerOutcome,
  { emoji: string; title: (authorName: string) => string }
> = {
  yes: { emoji: "🎉", title: () => "It's a date!" },
  suggested: { emoji: "📨", title: () => "Your suggestion is sent" },
  no: {
    emoji: "🌷",
    title: (authorName) => `Thanks for letting ${authorName} know`,
  },
  suggestionAccepted: { emoji: "🎉", title: () => "It's a date!" },
  suggestionDeclined: {
    emoji: "🌷",
    title: (authorName) => `${authorName} can't make it this time`,
  },
};

// The message the person sends to the author. Only for their own answer:
// after the author decides, there is nothing new to tell.
const SHARE_TEXTS: Partial<Record<AnswerOutcome, string>> = {
  yes: "I said yes to your invitation! 🎉",
  suggested: "I suggested another option for our date 📨",
  no: "I answered your invitation 🌷",
};

export function ResponseSummary({
  answer,
  authorName,
  path,
  isJustSent,
}: ResponseSummaryProps) {
  const { outcome } = answer;
  const heading = HEADINGS[outcome];
  const shareText = SHARE_TEXTS[outcome];
  const showDetails = outcome !== "no" && outcome !== "suggestionDeclined";

  return (
    <section className="flex flex-col items-center gap-6 rounded-2xl border border-line bg-surface px-5 py-8 text-center">
      <h2 className="text-2xl font-bold text-ink">
        {heading.title(authorName)}
        {/* The emoji ends the heading line. A non-breaking space keeps it
            next to the last word. aria-hidden: it is only decoration. */}
        {" "}
        <span aria-hidden="true">{heading.emoji}</span>
      </h2>

      {outcome === "suggestionAccepted" && (
        <p className="-mt-3 text-sm text-muted">
          {authorName} accepted your suggestion.
        </p>
      )}

      {showDetails && <AnswerDetails answer={answer} ownNote="(your idea)" />}

      {/* The answer is saved, but the author gets no message from us.
          So telling them is the main action of this screen. */}
      {shareText && (
        <ShareMenu
          path={path}
          text={shareText}
          buttonLabel={`Let ${authorName} know`}
          hint={isJustSent ? `${authorName} doesn't know yet` : undefined}
        />
      )}

      {outcome === "suggested" && (
        <p className="text-sm text-muted">
          {isJustSent
            ? `Open the link ${authorName} sent you again to see what they say.`
            : `Waiting for ${authorName} to answer your suggestion.`}
        </p>
      )}
    </section>
  );
}
