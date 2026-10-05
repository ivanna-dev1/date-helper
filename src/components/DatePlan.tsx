import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarMenu } from "@/components/CalendarMenu";
import { LocalDateTime } from "@/components/LocalDateTime";
import { ShareMenu } from "@/components/ShareMenu";
import { buildGoogleCalendarUrl, DATE_LENGTH_MINUTES } from "@/lib/calendar";
import type { SentAnswer } from "@/lib/responseView";

const QUIET_BUTTON =
  "w-full rounded-xl border border-line py-3 text-center text-sm font-medium text-muted";

type DatePlanProps = {
  notifyButton?: ReactNode;
  answer: SentAnswer;
  whoPaysText: string | null;
  invitePath: string;
  friendPath: string;
  eventTitle: string;
};

export function DatePlan({
  answer,
  whoPaysText,
  invitePath,
  friendPath,
  eventTitle,
  notifyButton,
}: DatePlanProps) {
  const location = [answer.place, answer.placeNote].filter(Boolean).join(", ");

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {answer.time && (
        <p className="text-base font-semibold text-ink">
          <LocalDateTime value={answer.time} format="long" />
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

      {notifyButton}

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

      <Link
        href={`/weather?back=${encodeURIComponent(invitePath)}`}
        className={QUIET_BUTTON}
      >
        Weather
      </Link>

      <ShareMenu
        path={friendPath}
        withTimeZone
        text="Here are the details of my date, just so you know where I am"
        buttonLabel="Let a friend know where I am"
        variant="quiet"
      />
    </div>
  );
}
