import type { Listing } from '@/features/house-scanner/types/contracts';
import { hasPin } from '@/features/house-scanner/utils/listing-position';
import { hasViewingWithin } from '@/features/house-scanner/utils/viewings';

export const MANUAL_HOST = 'Added by household';
export const ALL_HOSTS = 'all';

// Which of this member's hidden homes to include.
export type HiddenView = 'not-hidden' | 'hidden-only' | 'both';

export interface ListingFilters {
  minPriceSek: number | null;
  maxPriceSek: number | null;
  minAreaM2: number | null;
  maxAreaM2: number | null;
  minRooms: number | null;
  host: string;
  outdoorOnly: boolean;
  aboveGroundOnly: boolean;
  liftOnly: boolean;
  glazedOnly: boolean;
  notOnMapOnly: boolean;
  includeUnknown: boolean;
  hidden: HiddenView;
  // Cross-posted copies of a home stay out of view unless this is on.
  showDuplicates: boolean;
  // Only homes with a viewing in the next so many days; null means any.
  viewingWithinDays: number | null;
}

export const emptyFilters: ListingFilters = {
  minPriceSek: null,
  maxPriceSek: null,
  minAreaM2: null,
  maxAreaM2: null,
  minRooms: null,
  host: ALL_HOSTS,
  outdoorOnly: false,
  aboveGroundOnly: false,
  liftOnly: false,
  glazedOnly: false,
  notOnMapOnly: false,
  includeUnknown: true,
  hidden: 'not-hidden',
  showDuplicates: false,
  viewingWithinDays: null,
};

// Values come from form inputs, so anything not a finite non-negative number is unset.
function clean(value: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

export function listingHost(listing: Listing): string {
  return listing.origin === 'manual'
    ? MANUAL_HOST
    : new URL(listing.sourceUrls[0]).hostname;
}

export function activeFilterCount(filters: ListingFilters): number {
  return [
    clean(filters.minPriceSek) !== null || clean(filters.maxPriceSek) !== null,
    clean(filters.minAreaM2) !== null || clean(filters.maxAreaM2) !== null,
    clean(filters.minRooms) !== null,
    filters.host !== ALL_HOSTS,
    filters.outdoorOnly,
    filters.aboveGroundOnly,
    filters.liftOnly,
    filters.glazedOnly,
    filters.notOnMapOnly,
    filters.hidden !== emptyFilters.hidden,
    filters.showDuplicates,
    filters.viewingWithinDays !== null,
  ].filter(Boolean).length;
}

export function applyListingFilters(
  listings: Listing[],
  filters: ListingFilters,
  hiddenIds: ReadonlySet<string> = new Set(),
  duplicateIds: ReadonlySet<string> = new Set(),
  now: number = Date.now(),
): Listing[] {
  const minPrice = clean(filters.minPriceSek);
  const maxPrice = clean(filters.maxPriceSek);
  const minArea = clean(filters.minAreaM2);
  const maxArea = clean(filters.maxAreaM2);
  const minRooms = clean(filters.minRooms);
  // An active range with an unknown value is kept or hidden as one choice.
  function inRange(
    value: number | null,
    min: number | null,
    max: number | null,
    disputed = false,
  ) {
    if (min === null && max === null) return true;
    if (value === null || disputed) return filters.includeUnknown;
    return (min === null || value >= min) && (max === null || value <= max);
  }
  return listings.filter((listing) => {
    const { facts, conflicts } = listing;
    return (
      inRange(
        facts.askingPriceSek,
        minPrice,
        maxPrice,
        conflicts.includes('askingPriceSek'),
      ) &&
      inRange(facts.livingAreaM2, minArea, maxArea) &&
      inRange(facts.rooms, minRooms, null) &&
      (filters.host === ALL_HOSTS || listingHost(listing) === filters.host) &&
      (!filters.outdoorOnly ||
        facts.outdoor === 'balcony' ||
        facts.outdoor === 'terrace' ||
        facts.outdoor === 'both') &&
      (!filters.aboveGroundOnly || facts.groundFloor === false) &&
      (!filters.liftOnly ||
        (facts.lift === true && !conflicts.includes('lift'))) &&
      (!filters.glazedOnly ||
        (facts.glazed === true && !conflicts.includes('glazed'))) &&
      (!filters.notOnMapOnly || !hasPin(listing.coordinates)) &&
      (filters.hidden === 'both' ||
        hiddenIds.has(listing.id) === (filters.hidden === 'hidden-only')) &&
      (filters.showDuplicates || !duplicateIds.has(listing.id)) &&
      (filters.viewingWithinDays === null ||
        hasViewingWithin(listing, filters.viewingWithinDays, now))
    );
  });
}
