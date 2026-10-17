import { useCallback, useRef, useState } from 'react';

export const MAX_HIDDEN = 2000;

interface UseHiddenListingsOptions {
  householdId: string;
  userId: string;
  // False in the demo, which keeps nothing in the browser.
  persist: boolean;
}

// shortcut: ids live in this browser only, so hiding is per device; the database phase swaps
// this for a table and RPCs, and only this hook changes.
function storageKey(householdId: string, userId: string) {
  return `house-scanner:hidden:${householdId}:${userId}`;
}

function read(key: string, persist: boolean): Set<string> {
  if (!persist) return new Set();
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return new Set(
      Array.isArray(stored)
        ? stored
            .filter((id): id is string => typeof id === 'string')
            .slice(0, MAX_HIDDEN)
        : [],
    );
  } catch {
    return new Set();
  }
}

function write(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // Storage is denied or full; the in-memory set still works for this visit.
  }
}

export function useHiddenListings({
  householdId,
  userId,
  persist,
}: UseHiddenListingsOptions) {
  const key = storageKey(householdId, userId);
  const [state, setState] = useState(() => ({
    key,
    ids: read(key, persist),
  }));
  // A different household or member brings their own list.
  let current = state;
  if (state.key !== key) {
    current = { key, ids: read(key, persist) };
    setState(current);
  }
  const latest = useRef(current);
  latest.current = current;
  const change = useCallback(
    (update: (ids: Set<string>) => void) => {
      const ids = new Set(latest.current.ids);
      update(ids);
      // Drop the oldest ids rather than grow without limit.
      for (const id of ids) {
        if (ids.size <= MAX_HIDDEN) break;
        ids.delete(id);
      }
      latest.current = { key: latest.current.key, ids };
      setState(latest.current);
      if (persist) write(latest.current.key, ids);
    },
    [persist],
  );
  const hide = useCallback(
    (listingId: string) => change((ids) => ids.add(listingId)),
    [change],
  );
  const unhide = useCallback(
    (listingId: string) => change((ids) => ids.delete(listingId)),
    [change],
  );
  return { hidden: current.ids, hide, unhide };
}
