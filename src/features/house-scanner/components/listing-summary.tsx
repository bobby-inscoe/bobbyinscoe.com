import { Button, Stack, Text } from '@mantine/core';

import type {
  Listing,
  Snapshot,
} from '@/features/house-scanner/types/contracts';
import { formatPrice } from '@/features/house-scanner/utils/format';
import {
  listingMatches,
  SECTION_LABELS,
} from '@/features/house-scanner/utils/match-listing';

// The lines the list card and the details sheet share.
export function PriceLine({ listing }: { listing: Listing }) {
  const current = listing.facts.askingPriceSek;
  const previous = listing.previousAskingPriceSek;
  const changed =
    previous !== null &&
    current !== null &&
    previous !== current &&
    !listing.conflicts.includes('askingPriceSek');
  return (
    <Text fz="lg" fw={700}>
      {changed && (
        <>
          <s>{formatPrice(previous)}</s>{' '}
          <span
            role="img"
            aria-label={
              current < previous ? 'Price decreased' : 'Price increased'
            }
          >
            {current < previous ? '↓' : '↑'}
          </span>{' '}
        </>
      )}
      {formatPrice(current)}
      {listing.conflicts.includes('askingPriceSek') && ' (disputed)'}
    </Text>
  );
}

export function FactsLine({ listing }: { listing: Listing }) {
  return (
    <Text size="sm" c="dimmed">
      {listing.facts.livingAreaM2 ?? 'Unknown'} m²
      {listing.conflicts.includes('livingAreaM2') && ' (disputed)'} ·{' '}
      {listing.facts.rooms ?? 'Unknown'} rooms
      {listing.conflicts.includes('rooms') && ' (disputed)'} ·{' '}
      {listing.facts.propertyType ?? 'Type unknown'}
      {listing.conflicts.includes('propertyType') && ' (disputed)'}
    </Text>
  );
}

interface MatchLinesProps {
  listing: Listing;
  snapshot: Snapshot;
  // Adds the reasons and caveats behind each label.
  details?: boolean;
}

export function MatchLines({ listing, snapshot, details }: MatchLinesProps) {
  const matches = listingMatches(listing, snapshot);
  return (
    <>
      {matches.map(({ profile, result }) => (
        <Stack key={profile.id} gap={4}>
          <Text size="sm" fw={600}>
            {matches.length > 1 && `${profile.name}: `}
            {SECTION_LABELS[result.section]}
          </Text>
          {details && (
            <>
              <Text size="sm">{result.reasons.join('; ')}</Text>
              <Text size="sm" c="dimmed">
                {result.caveats.join('; ')}
              </Text>
            </>
          )}
        </Stack>
      ))}
      {matches.length === 0 && (
        <Text size="sm">
          No enabled search profiles. This home has not been matched.
        </Text>
      )}
    </>
  );
}

export function OriginalListingButton({ listing }: { listing: Listing }) {
  return (
    <Button
      component="a"
      size="xs"
      variant="default"
      href={listing.sourceUrls[0]}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      // The global `a { color: inherit }` rule would otherwise override the button's label color.
      style={{ color: 'var(--button-color)', textDecoration: 'none' }}
    >
      Open original listing
    </Button>
  );
}
