import Link from "next/link";
import { CalendarMenu } from "@/components/CalendarMenu";
import { LocalDateTime } from "@/components/LocalDateTime";
import { ShareMenu } from "@/components/ShareMenu";
import { buildGoogleCalendarUrl, DATE_LENGTH_MINUTES } from "@/lib/calendar";
import type { SentAnswer } from "@/lib/responseView";

type DatePlanProps = {
  answer: SentAnswer;
  whoPaysText: string | null;
  invitePath: string; // "/i/k7Fq2mXp9RtA"
  friendPath: string; // "/f/Qw3...", the read-only page for a friend
  eventTitle: string; // "Date with Olia"
};

// The agreed date: when, where, and who pays.
// Both people see the same block, like in the mockup (screen 3).
// The weather link leads to a "coming soon" page for now.
export function DatePlan({
  answer,
  whoPaysText,
  invitePath,
  friendPath,
  eventTitle,
}: DatePlanProps) {
  const location = [answer.place, answer.placeNote].filter(Boolean).join(", ");

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {answer.time && (
        <p className="text-base font-semibold text-ink">
          <LocalDateTime value={answer.time} format="long" />
          {" · "}
          <Link
            href={`/weather?back=${encodeURIComponent(invitePath)}`}
            className="text-sm font-normal text-muted underline"
          >
            Weather
          </Link>
        </p>
      )}

      {answer.place && (
        <div className="w-full rounded-xl bg-bg px-4 py-3">
          <p className="text-sm font-semibold text-ink">{answer.place}</p>
          {answer.placeNote && (
            <p className="mt-1 text-xs text-muted">{answer.placeNote}</p>
          )}
        </div>
      )}

      {whoPaysText && (
        <p className="text-xs italic text-quiet">{whoPaysText}</p>
      )}

      {answer.time && (
        <CalendarMenu
          googleUrl={buildGoogleCalendarUrl({
            title: eventTitle,
            start: new Date(answer.time),
            durationMinutes: DATE_LENGTH_MINUTES,
            location: location || null,
          })}
          icsPath={`${invitePath}/calendar`}
        />
      )}

      {/* A calm, secondary button: easy to find for those who need it,
          and not loud for everyone else. */}
      <ShareMenu
        path={friendPath}
        text="Here are the details of my date, just so you know where I am"
        buttonLabel="Let a friend know where I am"
        variant="quiet"
      />
    </div>
  );
}
