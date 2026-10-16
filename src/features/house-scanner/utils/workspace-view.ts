import type {
  Listing,
  Snapshot,
} from '@/features/house-scanner/types/contracts';
import { matchListing } from '@/features/house-scanner/utils/match-listing';

export const SECTION_LABELS = {
  preferred: 'Within budget',
  stretch: 'Stretch budget',
  exceptions: 'Close to your criteria',
  'needs-details': 'Missing info',
  outside: 'Outside current criteria',
};

export function listingMatches(listing: Listing, snapshot: Snapshot) {
  return snapshot.profiles
    .filter((profile) => profile.enabled)
    .map((profile) => ({
      profile,
      result: matchListing(listing, profile.criteria),
    }));
}

export function normalizeManualUrl(value: string) {
  const url = new URL(value);
  for (const key of [...url.searchParams.keys()]) {
    if (
      key.toLowerCase().startsWith('utm_') ||
      ['fbclid', 'gclid', 'msclkid'].includes(key.toLowerCase())
    )
      url.searchParams.delete(key);
  }
  return url.href;
}

export function formatPrice(value: number | null) {
  return value === null
    ? 'Price unknown'
    : `${new Intl.NumberFormat('sv-SE').format(value)} SEK`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeZone: 'Europe/Stockholm',
    timeStyle: 'short',
  }).format(new Date(value));
}
