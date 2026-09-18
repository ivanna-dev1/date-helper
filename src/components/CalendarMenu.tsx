"use client";

import { useId, useState } from "react";

type CalendarMenuProps = {
  googleUrl: string; // opens a ready event in Google Calendar
  icsPath: string; // "/i/k7Fq2mXp9RtA/calendar", the .ics file
};

const optionStyle =
  "flex items-center justify-center rounded-xl border border-line bg-surface px-3 py-3 text-sm font-medium text-ink";

// One "Add to calendar" button. The choice of calendar appears only
// after a click, so the card stays calm.
export function CalendarMenu({ googleUrl, icsPath }: CalendarMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const optionsId = useId();

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={optionsId}
        // The same calm look as the other buttons under the plan.
        className="w-full rounded-xl border border-line py-3 text-sm font-medium text-muted"
      >
        Add to calendar
      </button>

      {isOpen && (
        <div id={optionsId} className="grid grid-cols-2 gap-2">
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className={optionStyle}
          >
            Google
          </a>
          {/* A file link. `download` asks the browser to save it; a phone
              usually opens it in the calendar app right away. */}
          <a
            href={icsPath}
            download="date.ics"
            onClick={() => setIsOpen(false)}
            className={optionStyle}
          >
            Apple / Outlook
          </a>
        </div>
      )}
    </div>
  );
}
