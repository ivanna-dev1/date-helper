// Builds an .ics file (RFC 5545) that calendar apps can open.

type CalendarEvent = {
  uid: string; // a stable id, so a second download updates the same event
  title: string;
  start: Date;
  durationMinutes: number;
  location: string | null;
  description: string | null;
};

// UTC form (20261219T100000Z); the calendar shows the reader's zone.
export function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Escape commas, semicolons and backslashes; a newline becomes a literal backslash-n.
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Usual length for a date; the author is not asked.
export const DATE_LENGTH_MINUTES = 120;

const MAX_LINE_BYTES = 75;
const encoder = new TextEncoder();

// Lines over 75 bytes are folded; count bytes (emoji) and never cut a letter.
function foldLine(line: string): string {
  const parts: string[] = [];
  let part = "";
  let partBytes = 0;
  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    // Continuation lines start with a space: one more byte.
    const limit = parts.length === 0 ? MAX_LINE_BYTES : MAX_LINE_BYTES - 1;
    if (partBytes + charBytes > limit) {
      parts.push(part);
      part = "";
      partBytes = 0;
    }
    part += char;
    partBytes += charBytes;
  }
  parts.push(part);
  return parts.join("\r\n ");
}

export function buildIcs(event: CalendarEvent): string {
  const end = new Date(event.start.getTime() + event.durationMinutes * 60_000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Date Helper//EN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(event.start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];
  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");

  // The format needs CRLF at the end of every line.
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

// Link that opens a ready "new event" form in any browser.
export function buildGoogleCalendarUrl(event: {
  title: string;
  start: Date;
  durationMinutes: number;
  location: string | null;
}): string {
  const end = new Date(event.start.getTime() + event.durationMinutes * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toIcsDate(event.start)}/${toIcsDate(end)}`,
    details: "Planned with Date Helper",
  });
  if (event.location) {
    params.set("location", event.location);
  }
  return `https://calendar.google.com/calendar/render?${params}`;
}
