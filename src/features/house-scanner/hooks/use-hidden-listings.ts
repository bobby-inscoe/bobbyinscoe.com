import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Snapshot } from '@/features/house-scanner/types/contracts';
import type { HouseholdActions } from '@/features/house-scanner/types/household';

interface UseHiddenListingsOptions
  extends Partial<Pick<HouseholdActions, 'onSetHidden'>> {
  snapshot: Snapshot;
  userId: string;
  // False in the demo, which never had a browser list to move.
  persist: boolean;
}

// Before the database held hides, a member's list lived in this browser under this key.
// It is read once to move it to the server and then removed.
function storageKey(householdId: string, userId: string) {
  return `house-scanner:hidden:${householdId}:${userId}`;
}

function readStored(key: string): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    return Array.isArray(stored)
      ? stored.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

function removeStored(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage is denied; the old list stays unread.
  }
}

export function useHiddenListings({
  snapshot,
  userId,
  persist,
  onSetHidden,
}: UseHiddenListingsOptions) {
  const hidden = useMemo(
    () => new Set(snapshot.hiddenListingIds ?? []),
    [snapshot.hiddenListingIds],
  );
  // The session hands out a new action on every render; callers keep stable functions.
  const action = useRef(onSetHidden);
  action.current = onSetHidden;
  const write = useCallback((listingId: string, hide: boolean) => {
    // The session has already put the app in its error state when a write fails, so there is nothing to add here.
    action.current?.([listingId], hide).catch(() => {});
  }, []);
  const hide = useCallback(
    (listingId: string) => write(listingId, true),
    [write],
  );
  const unhide = useCallback(
    (listingId: string) => write(listingId, false),
    [write],
  );
  const moving = useRef<string | null>(null);
  const { householdId, listings } = snapshot;
  useEffect(() => {
    const key = storageKey(householdId, userId);
    if (!persist || !action.current || moving.current === key) return;
    const stored = readStored(key);
    if (stored.length === 0) return removeStored(key);
    const present = new Set(listings.map((listing) => listing.id));
    const ids = stored.filter((id) => present.has(id));
    if (ids.length === 0) return removeStored(key);
    // A refresh while the call is pending must not send it twice.
    moving.current = key;
    action
      .current(ids, true)
      .then(() => removeStored(key))
      .catch(() => {
        // The key stays, and the next load tries again.
        moving.current = null;
      });
  }, [householdId, listings, userId, persist]);
  return { hidden, hide, unhide };
}
