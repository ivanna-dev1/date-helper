import { useSyncExternalStore } from "react";

// The values we read here never change while the page is open,
// so there is nothing to subscribe to.
function noSubscribe() {
  return () => {};
}

/**
 * Reads a value that exists only in the browser: the site address,
 * the reader's time zone, "today", browser features.
 *
 * On the server and during hydration it gives `serverValue`, so the first
 * render is the same on both sides. Then React uses `read()`.
 * `read` must return a simple value (string, number, boolean), because
 * React compares the results with ===.
 */
export function useBrowserValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noSubscribe, read, () => serverValue);
}
