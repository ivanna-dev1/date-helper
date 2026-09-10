"use client";

import { useState } from "react";

// Every row needs an id that never changes. React uses it as a `key`,
// so it can tell rows apart after we remove one from the middle.
export type Draft = { id: string };

/**
 * Keeps a list of form rows that the user can add, remove and edit.
 * Used for both "when" and "where" lists.
 */
export function useDraftList<T extends Draft>(createDraft: () => T) {
  const [items, setItems] = useState<T[]>(() => [createDraft()]);

  function add() {
    setItems((current) => [...current, createDraft()]);
  }

  function remove(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  // `changes` holds only the fields we want to change, for example { note: "..." }.
  function update(id: string, changes: Partial<T>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }

  return { items, add, remove, update };
}
