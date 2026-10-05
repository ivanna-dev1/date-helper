"use client";

import { useId, useState } from "react";

type CalendarMenuProps = {
  googleUrl: string;
  icsPath: string;
};

const optionStyle =
  "flex items-center justify-center rounded-xl border border-line bg-surface px-3 py-3 text-sm font-medium text-ink";

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
