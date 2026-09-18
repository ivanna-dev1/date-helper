// Builds an .ics file: the common calendar format that Google Calendar,
// Apple Calendar and Outlook all can open.
// The format is plain text, one "NAME:value" pair per line (RFC 5545).

type CalendarEvent = {
  uid: string; // a stable id, so a second download updates the same event
  title: string;
  start: Date;
  durationMinutes: number;
  location: string | null;
  description: string | null;
};

// Dates go in UTC in the form 20261219T100000Z. The calendar app then
// shows them in the reader's own time zone.
export function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Commas, semicolons and backslashes have a special meaning in the format,
// so they get a backslash before them. A new line is written as "\n".
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// How long the event is in the calendar. We do not ask the author,
// so we take a usual length for a date.
export const DATE_LENGTH_MINUTES = 120;

const MAX_LINE_BYTES = 75;
const encoder = new TextEncoder();

// A line must not be longer than 75 bytes. A longer one is cut into parts,
// and each next part starts with a space. We count bytes, because emoji
// and non-English letters take more than one byte, and we never cut
// in the middle of a letter.
function foldLine(line: string): string {
  const parts: string[] = [];
  let part = "";
  let partBytes = 0;
  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    // Every part after the first starts with a space: one more byte.
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

  // The format asks for "\r\n" at the end of every line.
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

// Google Calendar has a link that opens a ready "new event" form.
// It works in any browser, also on a computer, so the person does not
// need to deal with a downloaded file.
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
