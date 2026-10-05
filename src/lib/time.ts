// Converts datetime-local to a UTC string. Call it in the browser: only it knows the person's zone.
// Empty or broken values are returned as is; the server reports them.
export function toUtcString(localValue: string): string {
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? localValue : date.toISOString();
}
