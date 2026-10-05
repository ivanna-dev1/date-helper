"use client";

import { useState } from "react";

// A stable id per row, used as the React key.
export type Draft = { id: string };

export function useDraftList<T extends Draft>(createDraft: () => T) {
  const [items, setItems] = useState<T[]>(() => [createDraft()]);

  function add() {
    setItems((current) => [...current, createDraft()]);
  }

  function remove(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function update(id: string, changes: Partial<T>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }

  // Replaces the whole list; an empty list still gets one empty row.
  function replace(nextItems: T[]) {
    setItems(nextItems.length > 0 ? nextItems : [createDraft()]);
  }

  return { items, add, remove, update, replace };
}
