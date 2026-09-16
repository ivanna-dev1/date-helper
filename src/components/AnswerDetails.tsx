import { LocalDateTime } from "@/components/LocalDateTime";
import type { SentAnswer } from "@/lib/responseView";

type AnswerDetailsProps = {
  answer: SentAnswer;
  // The note next to a suggested value: "(your idea)" for the invited
  // person, "(Max's idea)" for the author.
  ownNote: string;
};

const labelStyle = "text-xs font-medium uppercase tracking-wide text-muted";
const ownNoteStyle = "ml-1 text-sm text-quiet";

// "When" and "Where" of an answer. Both pages show it.
export function AnswerDetails({ answer, ownNote }: AnswerDetailsProps) {
  return (
    <dl className="flex flex-col gap-4">
      {answer.time && (
        <div className="flex flex-col gap-1">
          <dt className={labelStyle}>When</dt>
          <dd className="text-base font-semibold text-ink">
            <LocalDateTime value={answer.time} />
            {answer.isOwnTime && <span className={ownNoteStyle}>{ownNote}</span>}
          </dd>
        </div>
      )}
      {answer.place && (
        <div className="flex flex-col gap-1">
          <dt className={labelStyle}>Where</dt>
          <dd className="text-base font-semibold text-ink">
            {answer.place}
            {answer.isOwnPlace && (
              <span className={ownNoteStyle}>{ownNote}</span>
            )}
          </dd>
        </div>
      )}
    </dl>
  );
}
