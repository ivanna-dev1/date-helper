"use client";

import { PAY_CHOICES, type PayChoice } from "@/lib/whoPays";

type PayChipsProps = {
  value: PayChoice;
  onChange: (value: PayChoice) => void;
};

// "Who pays?" as small quiet chips, like in the author's form.
// The words are from the chooser's side: "My treat" always means "I pay",
// so the back-and-forth "I'll pay" — "no, I'll pay" works for both people.
// Not choosing is fine: a click on the picked chip clears it.
export function PayChips({ value, onChange }: PayChipsProps) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        Who pays? — optional
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {PAY_CHOICES.map((choice) => {
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
