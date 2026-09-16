/**
 * Turns the value of <input type="datetime-local"> ("2026-12-20T18:00")
 * into a UTC string with a zone ("2026-12-20T16:00:00.000Z").
 *
 * Call it in the browser: only the browser knows the person's time zone.
 * The server may run in another zone and would read the time wrong.
 *
 * An empty or broken value is returned as it is. The server will say
 * what is wrong with it.
 */
export function toUtcString(localValue: string): string {
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? localValue : date.toISOString();
}
