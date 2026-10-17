import { Button, CloseButton, Group, Text, Title } from '@mantine/core';

import styles from '@/features/house-scanner/components/household-workspace.module.css';
import { ListingPhoto } from '@/features/house-scanner/components/listing-card';
import type { Listing } from '@/features/house-scanner/types/contracts';
import { formatPrice } from '@/features/house-scanner/utils/format';

// A compact card for the home chosen on the map: photo, headline facts and the way to the listing.
export function PinCard({
  listing,
  onClose,
  onDetails,
}: {
  listing: Listing;
  onClose: () => void;
  onDetails: () => void;
}) {
  return (
    <article
      className={styles.pinCard}
      aria-label={`Selected home: ${listing.title}`}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Title order={3} size="h5">
          {listing.title}
        </Title>
        <CloseButton aria-label="Close selected home" onClick={onClose} />
      </Group>
      <ListingPhoto listing={listing} />
      <Text fw={600}>
        {formatPrice(listing.facts.askingPriceSek)}
        {listing.conflicts.includes('askingPriceSek') && ' (disputed)'}
      </Text>
      <Text size="sm">
        {listing.facts.livingAreaM2 ?? 'Unknown'} m² ·{' '}
        {listing.facts.rooms ?? 'Unknown'} rooms
      </Text>
      <Group gap="xs">
        <Button
          component="a"
          size="sm"
          href={listing.sourceUrls[0]}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          // The global `a { color: inherit }` rule would otherwise hide the label on the filled button.
          style={{ color: 'var(--button-color)', textDecoration: 'none' }}
        >
          Open original listing
        </Button>
        <Button size="sm" variant="default" onClick={onDetails}>
          Details
        </Button>
      </Group>
    </article>
  );
}
