import Link from "next/link";
import type { WhoPays } from "@/generated/prisma/enums";
import { AnswerDetails } from "@/components/AnswerDetails";
import { DatePlan } from "@/components/DatePlan";
import { getWhoPaysText } from "@/lib/whoPays";
import { ShareMenu } from "@/components/ShareMenu";
import { SuggestionDecision } from "@/components/SuggestionDecision";
import type { AnswerOutcome, SentAnswer } from "@/lib/responseView";

type AuthorAnswerProps = {
  answer: SentAnswer;
  respondentName: string;
  authorName: string;
  whoPays: WhoPays | null;
  message: string | null; // the invited person's few words, if any
  secretToken: string; // for the accept / decline buttons
  friendToken: string; // for "Let a friend know where I am"
  publicPath: string; // the invited person's link, "/i/k7Fq2mXp9RtA"
};

// What the author sees for each outcome. No hearts, like elsewhere.
const HEADINGS: Record<
  AnswerOutcome,
  { emoji: string; title: (name: string) => string }
> = {
  // An agreed date has the same heading for both people.
  yes: { emoji: "🎉", title: () => "It's a date!" },
  no: { emoji: "🌷", title: (name) => `${name} can't this time` },
  suggested: {
    emoji: "📨",
    title: (name) => `${name} suggested another option`,
  },
  suggestionAccepted: { emoji: "🎉", title: () => "It's a date!" },
  suggestionDeclined: {
    emoji: "🌷",
    title: (name) => `You declined ${name}'s suggestion`,
  },
};

// After the author decides, the invited person does not know it yet.
// The author tells them the same way: a message with the same link.
const SHARE_TEXTS: Partial<Record<AnswerOutcome, string>> = {
  suggestionAccepted: "I said yes to your suggestion! 🎉",
  suggestionDeclined: "Sorry, your suggestion doesn't work for me 🌷",
};

// The answer, shown on the author's page.
export function AuthorAnswer({
  answer,
  respondentName,
  authorName,
  whoPays,
  message,
  secretToken,
  friendToken,
  publicPath,
}: AuthorAnswerProps) {
  const { outcome } = answer;
  const heading = HEADINGS[outcome];
  const shareText = SHARE_TEXTS[outcome];
  const isNo = outcome === "no" || outcome === "suggestionDeclined";
  const isAgreed = outcome === "yes" || outcome === "suggestionAccepted";

  return (
    <section className="flex flex-col items-center gap-6 rounded-2xl border border-line bg-surface px-5 py-8 text-center">
      <h2 className="text-2xl font-bold text-ink">
        {heading.title(respondentName)}
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
          You accepted {respondentName}&apos;s suggestion.
        </p>
      )}

      {/* The date is agreed: the same plan as the invited person sees. */}
      {isAgreed && (
        <DatePlan
          answer={answer}
          whoPaysText={getWhoPaysText(whoPays, authorName, "author")}
          invitePath={publicPath}
          friendPath={`/f/${friendToken}`}
          eventTitle={`Date with ${respondentName}`}
          // The invited person does not know the decision yet,
          // so this button stands first under the plan.
          notifyButton={
            shareText ? (
              <ShareMenu
                // The tag changes the address, so the messenger loads a
                // fresh preview instead of the one it remembered.
                path={`${publicPath}?s=${outcome}`}
                text={shareText}
                buttonLabel={`Let ${respondentName} know`}
              />
            ) : null
          }
        />
      )}
      {!isAgreed && shareText && (
        <ShareMenu
          path={`${publicPath}?s=${outcome}`}
          text={shareText}
          buttonLabel={`Let ${respondentName} know`}
        />
      )}

      {outcome === "suggested" && (
        <AnswerDetails answer={answer} ownNote={`(${respondentName}'s idea)`} />
      )}

      {message && (
        <p className="w-full rounded-xl border-l-4 border-brand bg-bg p-4 text-left text-base text-ink">
          {message}
        </p>
      )}

      {outcome === "suggested" && (
        <SuggestionDecision secretToken={secretToken} />
      )}

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
