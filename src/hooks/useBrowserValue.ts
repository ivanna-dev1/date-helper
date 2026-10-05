import { useSyncExternalStore } from "react";

// These values never change while the page is open: nothing to subscribe to.
function noSubscribe() {
  return () => {};
}

// Reads a browser-only value. Server and hydration use serverValue; read() must return a primitive (compared with ===).
export function useBrowserValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noSubscribe, read, () => serverValue);
}
