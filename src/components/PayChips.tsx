"use client";

import { getPayChoices, type PayChoice } from "@/lib/whoPays";

type PayChipsProps = {
  value: PayChoice;
  onChange: (value: PayChoice) => void;
  offeredBy: string | null;
};

export function PayChips({ value, onChange, offeredBy }: PayChipsProps) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        Who pays? — optional
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {getPayChoices(offeredBy).map((choice) => {
          const isActive = choice.value === value;
          return (
            <button
              key={choice.value}
              type="button"
              onClick={() => onChange(isActive ? null : choice.value)}
              aria-pressed={isActive}
              className={`rounded-xl border px-2.5 py-1.5 text-xs ${
                isActive
                  ? "border-line bg-surface text-muted"
                  : "border-line/60 text-quiet"
              }`}
            >
              {choice.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
