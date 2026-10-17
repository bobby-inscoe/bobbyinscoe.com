import type { Listing } from '@/features/house-scanner/types/contracts';
import { hasPin } from '@/features/house-scanner/utils/listing-position';

export const MANUAL_HOST = 'Added by household';
export const ALL_HOSTS = 'all';

export interface ListingFilters {
  minPriceMsek: number | null;
  maxPriceMsek: number | null;
  minAreaM2: number | null;
  maxAreaM2: number | null;
  minRooms: number | null;
  host: string;
  outdoorOnly: boolean;
  aboveGroundOnly: boolean;
  notOnMapOnly: boolean;
  includeUnknown: boolean;
}

export const emptyFilters: ListingFilters = {
  minPriceMsek: null,
  maxPriceMsek: null,
  minAreaM2: null,
  maxAreaM2: null,
  minRooms: null,
  host: ALL_HOSTS,
  outdoorOnly: false,
  aboveGroundOnly: false,
  notOnMapOnly: false,
  includeUnknown: true,
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
    clean(filters.minPriceMsek) !== null ||
      clean(filters.maxPriceMsek) !== null,
    clean(filters.minAreaM2) !== null || clean(filters.maxAreaM2) !== null,
    clean(filters.minRooms) !== null,
    filters.host !== ALL_HOSTS,
    filters.outdoorOnly,
    filters.aboveGroundOnly,
    filters.notOnMapOnly,
  ].filter(Boolean).length;
}

export function applyListingFilters(
  listings: Listing[],
  filters: ListingFilters,
): Listing[] {
  const minPrice = clean(filters.minPriceMsek);
  const maxPrice = clean(filters.maxPriceMsek);
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
    const price =
      facts.askingPriceSek === null ? null : facts.askingPriceSek / 1_000_000;
    return (
      inRange(
        price,
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
      (!filters.notOnMapOnly || !hasPin(listing.coordinates))
    );
  });
}
