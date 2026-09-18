"use client";

import { useBrowserValue } from "@/hooks/useBrowserValue";

type LocalDateTimeProps = {
  value: string; // ISO string, for example "2026-09-12T15:00:00.000Z"
  // "short": "Sat, Sep 13, 12:00 PM" — for lists.
  // "long": "Saturday, September 13, 12:00 PM" — for the agreed date.
  format?: "short" | "long";
};

const FORMATS: Record<"short" | "long", Intl.DateTimeFormatOptions> = {
  short: {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
  long: {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
};

/**
 * Shows a date and time in the time zone of the person who looks at it.
 *
 * The database keeps time in UTC. The server does not know where the
 * reader is, so only the browser can turn UTC into local time. That is why
 * this is a client component and why the text is read in the browser only.
 */
export function LocalDateTime({ value, format = "short" }: LocalDateTimeProps) {
  const text = useBrowserValue<string | null>(
    () => new Date(value).toLocaleString("en-US", FORMATS[format]),
    null,
  );

  return <time dateTime={value}>{text ?? "…"}</time>;
}
