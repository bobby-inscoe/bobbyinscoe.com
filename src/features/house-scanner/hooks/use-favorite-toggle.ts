import { useState } from 'react';

import type { Snapshot } from '@/features/house-scanner/types/contracts';
import type { HouseholdActions } from '@/features/house-scanner/types/household';

interface UseFavoriteToggleOptions
  extends Partial<
    Pick<HouseholdActions, 'onSaveFavorite' | 'onRemoveFavorite'>
  > {
  snapshot: Snapshot;
  userId: string;
}

export function useFavoriteToggle({
  snapshot,
  userId,
  onSaveFavorite,
  onRemoveFavorite,
}: UseFavoriteToggleOptions) {
  const [pending, setPending] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  async function favorite(listingId: string) {
    const mine = snapshot.favorites.some(
      (entry) => entry.listingId === listingId && entry.userId === userId,
    );
    const action = mine ? onRemoveFavorite : onSaveFavorite;
    if (!action || pending.includes(listingId)) return;
    setPending((current) => [...current, listingId]);
    setMessage('');
    try {
      await action(listingId);
      setMessage(
        mine
          ? 'Your favorite was removed. Other members’ saves remain.'
          : 'Favorite saved.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not change your favorite. Try again.',
      );
    } finally {
      setPending((current) => current.filter((id) => id !== listingId));
    }
  }
  function canSave(listingId: string) {
    return Boolean(
      snapshot.favorites.some(
        (entry) => entry.listingId === listingId && entry.userId === userId,
      )
        ? onRemoveFavorite
        : onSaveFavorite,
    );
  }
  return { pending, message, favorite, canSave };
}
