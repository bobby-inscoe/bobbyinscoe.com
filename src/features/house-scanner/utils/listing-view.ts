import type { MapPoint } from '@/features/house-scanner/components/household-map';
import type {
  Listing,
  Snapshot,
} from '@/features/house-scanner/types/contracts';
import type { WorkspaceTab } from '@/features/house-scanner/types/household';
import {
  compactPrice,
  formatPrice,
} from '@/features/house-scanner/utils/format';
import { hasPin } from '@/features/house-scanner/utils/listing-position';
import { listingMatches } from '@/features/house-scanner/utils/match-listing';

// Homes without a usable position share one marker here, in the water off Gothenburg.
export const UNLOCATED_POSITION = { latitude: 57.69, longitude: 11.78 };

interface ListingScope {
  tab: WorkspaceTab;
  person: string;
  section: string;
  userId: string;
}

export function scopeListings(
  snapshot: Snapshot,
  { tab, person, section, userId }: ListingScope,
): Listing[] {
  return snapshot.listings.filter((listing) => {
    if (tab === 'favorites')
      return snapshot.favorites.some(
        (favorite) =>
          favorite.listingId === listing.id &&
          (person === 'everyone' ||
            favorite.userId === (person === 'mine' ? userId : person)),
      );
    if (listing.origin === 'manual')
      return section === 'all' || section === 'manual';
    if (section === 'manual') return false;
    return listingMatches(listing, snapshot).some(
      ({ result }) =>
        result.section !== 'outside' &&
        (section === 'all' || result.section === section),
    );
  });
}

export function mapPoints(listings: Listing[]): MapPoint[] {
  return listings.map((listing) => {
    const price = listing.conflicts.includes('askingPriceSek')
      ? 'Price disputed'
      : formatPrice(listing.facts.askingPriceSek);
    const status = listing.conflicts.includes('status')
      ? 'Status disputed'
      : listing.facts.status;
    return hasPin(listing.coordinates)
      ? {
          id: listing.id,
          coordinates: listing.coordinates,
          // Compact pin text; the label and card carry the full price or dispute.
          markerText:
            listing.facts.askingPriceSek === null ||
            listing.conflicts.includes('askingPriceSek')
              ? '?'
              : compactPrice(listing.facts.askingPriceSek),
          label: `${listing.title}: ${price} · ${status}`,
        }
      : {
          id: listing.id,
          coordinates: UNLOCATED_POSITION,
          markerText: '?',
          label: `${listing.title}: ${price} · ${status} · no known position`,
          unlocated: true,
        };
  });
}

export function sourceSummaries(listings: Listing[]) {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    if (listing.origin !== 'source') continue;
    const host = new URL(listing.sourceUrls[0]).hostname;
    counts.set(host, (counts.get(host) ?? 0) + 1);
  }
  return [...counts].map(([host, homes]) => ({ host, homes }));
}
