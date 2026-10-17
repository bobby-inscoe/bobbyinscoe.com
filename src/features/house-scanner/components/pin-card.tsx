import { Button, CloseButton, Group, Text, Title } from '@mantine/core';

import { FavoriteStar } from '@/features/house-scanner/components/favorite-star';
import { HideButton } from '@/features/house-scanner/components/hide-button';
import styles from '@/features/house-scanner/components/household-workspace.module.css';
import { ListingPhoto } from '@/features/house-scanner/components/listing-photo';
import {
  AlsoOn,
  KeyFacts,
} from '@/features/house-scanner/components/listing-summary';
import type { Listing } from '@/features/house-scanner/types/contracts';
import { formatPrice } from '@/features/house-scanner/utils/format';

// A compact card for the home chosen on the map: photo, headline facts and the way to the listing.
export function PinCard({
  listing,
  favorite,
  hidden,
  alsoOn,
  onFavorite,
  onToggleHidden,
  onClose,
  onDetails,
}: {
  listing: Listing;
  // The member's own favorite of this home.
  favorite: { mine: boolean; canSave: boolean; busy: boolean };
  hidden: boolean;
  alsoOn?: string[];
  onFavorite: (listingId: string) => void;
  onToggleHidden: (listingId: string) => void;
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
      <div className={styles.photoWrap}>
        <ListingPhoto listing={listing} />
        <HideButton
          listingId={listing.id}
          hidden={hidden}
          onToggle={onToggleHidden}
        />
        <FavoriteStar {...favorite} onToggle={() => onFavorite(listing.id)} />
      </div>
      <Text fw={600}>
        {formatPrice(listing.facts.askingPriceSek)}
        {listing.conflicts.includes('askingPriceSek') && ' (disputed)'}
      </Text>
      <KeyFacts listing={listing} />
      <AlsoOn sites={alsoOn} />
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
