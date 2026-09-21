import { LocalDateTime } from "@/components/LocalDateTime";
import type { SentAnswer } from "@/lib/responseView";

type AnswerDetailsProps = {
  answer: SentAnswer;
  // The note next to a suggested value: "(your idea)" for the invited
  // person, "(Max's idea)" for the author.
  ownNote: string;
  // "Olia is treating" and the like, or null when nobody chose.
  whoPaysText?: string | null;
  // true when the choice cards show the options on the same screen.
  hideChoices?: boolean;
};

const labelStyle = "text-xs font-medium uppercase tracking-wide text-muted";
const ownNoteStyle = "ml-1 text-sm text-quiet";
const valueStyle = "text-base font-semibold text-ink";
const noteStyle = "block text-sm font-normal text-muted";
const orStyle = "text-xs text-quiet";

// "When" and "Where" of an answer. Both pages show it.
// A suggestion with a choice shows all its options: "Friday or Saturday".
export function AnswerDetails({
  answer,
  ownNote,
  whoPaysText,
  hideChoices = false,
}: AnswerDetailsProps) {
  const choices = hideChoices ? null : answer.choices;

  return (
    <dl className="flex flex-col gap-4">
      {answer.time && (
        <div className="flex flex-col gap-1">
          <dt className={labelStyle}>When</dt>
          <dd className={valueStyle}>
            <LocalDateTime value={answer.time} />
            {answer.isOwnTime && (
              <span className={ownNoteStyle}>{ownNote}</span>
            )}
          </dd>
        </div>
      )}
      {choices && (
        <div className="flex flex-col gap-1">
          <dt className={labelStyle}>When</dt>
          {choices.times.map((time, index) => (
            <dd key={time.id} className={valueStyle}>
              {index > 0 && <span className={`${orStyle} block`}>or</span>}
              <LocalDateTime value={time.startsAt} />
            </dd>
          ))}
        </div>
      )}
      {answer.place && (
        <div className="flex flex-col gap-1">
          <dt className={labelStyle}>Where</dt>
          <dd className={valueStyle}>
            {answer.place}
            {answer.isOwnPlace && (
              <span className={ownNoteStyle}>{ownNote}</span>
            )}
            {answer.placeNote && (
              <span className={noteStyle}>{answer.placeNote}</span>
            )}
          </dd>
        </div>
      )}
      {choices && (
        <div className="flex flex-col gap-1">
          <dt className={labelStyle}>Where</dt>
          {choices.places.map((place, index) => (
            <dd key={place.id} className={valueStyle}>
              {index > 0 && <span className={`${orStyle} block`}>or</span>}
              {place.name}
              {place.note && <span className={noteStyle}>{place.note}</span>}
            </dd>
          ))}
        </div>
      )}
      {whoPaysText && (
        <p className="text-xs italic text-quiet">{whoPaysText}</p>
      )}
    </dl>
  );
}
