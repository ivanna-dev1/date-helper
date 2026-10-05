"use client";

import { useBrowserValue } from "@/hooks/useBrowserValue";

type LocalDateTimeProps = {
  value: string;
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

// Shows a time in the reader's own time zone (browser only).
export function LocalDateTime({ value, format = "short" }: LocalDateTimeProps) {
  const text = useBrowserValue<string | null>(
    () => new Date(value).toLocaleString("en-US", FORMATS[format]),
    null,
  );

  return <time dateTime={value}>{text ?? "…"}</time>;
}
