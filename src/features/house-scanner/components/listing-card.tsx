import { Badge, Button, Group, Text, Title } from '@mantine/core';
import { memo } from 'react';
import { FavoriteStar } from '@/features/house-scanner/components/favorite-star';
import { HideButton } from '@/features/house-scanner/components/hide-button';
import styles from '@/features/house-scanner/components/household-workspace.module.css';
import { ListingDetails } from '@/features/house-scanner/components/listing-details';
import { ListingPhoto } from '@/features/house-scanner/components/listing-photo';
import {
  AlsoOn,
  FactsLine,
  MatchLines,
  OriginalListingButton,
  PriceLine,
  ReasonChips,
} from '@/features/house-scanner/components/listing-summary';
import { NextViewing } from '@/features/house-scanner/components/viewing-list';
import type { ListingNotesController } from '@/features/house-scanner/hooks/use-listing-notes';
import type {
  Listing,
  Snapshot,
} from '@/features/house-scanner/types/contracts';
import { hasPin } from '@/features/house-scanner/utils/listing-position';

interface ListingCardProps {
  listing: Listing;
  snapshot: Snapshot;
  userId: string;
  selected?: boolean;
  // Shows the full details inline, for a card that stands alone.
  details?: boolean;
  stale?: boolean;
  busy: boolean;
  canSave: boolean;
  // Hidden by this member; shown only while the view includes hidden homes.
  hidden?: boolean;
  notes?: ListingNotesController;
  // Other sites carrying the same home.
  alsoOn?: string[];
  // The handlers take the card's id so a list can share one of each, which lets memo skip unchanged cards.
  onSelect: (listingId: string) => void;
  onFavorite: (listingId: string) => void;
  // Without it the card has no hide control.
  onToggleHidden?: (listingId: string) => void;
  // Shown only for homes that have a pin.
  onSeeOnMap?: (listingId: string) => void;
}

export const ListingCard = memo(function ListingCard({
  listing,
  snapshot,
  userId,
  selected,
  details,
  stale,
  busy,
  canSave,
  hidden,
  notes,
  alsoOn,
  onSelect,
  onFavorite,
  onToggleHidden,
  onSeeOnMap,
}: ListingCardProps) {
  const saved = snapshot.favorites.filter(
    (favorite) => favorite.listingId === listing.id,
  );
  const mine = saved.some((favorite) => favorite.userId === userId);
  const statusDisputed = listing.conflicts.includes('status');
  const showStatus = statusDisputed || listing.facts.status !== 'available';
  const memberName = (id: string | null) =>
    snapshot.members.find((member) => member.userId === id)?.displayName ||
    'Household member';
  return (
    <article
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      aria-label={listing.title}
    >
      <div className={styles.photoWrap}>
        <ListingPhoto listing={listing} />
        {onToggleHidden && (
          <HideButton
            listingId={listing.id}
            hidden={hidden === true}
            onToggle={onToggleHidden}
          />
        )}
        <FavoriteStar
          mine={mine}
          canSave={canSave}
          busy={busy}
          onToggle={() => onFavorite(listing.id)}
        />
      </div>
      <PriceLine listing={listing} />
      <Title order={3} size="h5" lineClamp={1}>
        {listing.title}
      </Title>
      <FactsLine listing={listing} />
      <AlsoOn sites={alsoOn} />
      <NextViewing listing={listing} />
      <ReasonChips listing={listing} snapshot={snapshot} />
      {(showStatus || listing.origin === 'manual' || stale || hidden) && (
        <Group gap="xs">
          {showStatus && (
            <Badge variant="light">
              {statusDisputed ? 'Status disputed' : listing.facts.status}
            </Badge>
          )}
          {listing.origin === 'manual' && (
            <Badge variant="outline">
              Added by {memberName(listing.addedBy)}
            </Badge>
          )}
          {stale && <Badge variant="outline">Not in latest scan</Badge>}
          {hidden && <Badge variant="outline">Hidden</Badge>}
        </Group>
      )}
      <MatchLines listing={listing} snapshot={snapshot} details={details} />
      {saved.length > 0 && (
        <Text size="sm">
          Saved by{' '}
          {saved.map((favorite) => memberName(favorite.userId)).join(', ')}
        </Text>
      )}
      <div className={styles.grow} />
      <Group>
        <OriginalListingButton listing={listing} />
        <Button
          size="xs"
          variant="default"
          onClick={() => onSelect(listing.id)}
          // Inline details toggle in place; otherwise the button opens a dialog.
          aria-pressed={details ? selected : undefined}
          aria-haspopup={details ? undefined : 'dialog'}
        >
          Details
        </Button>
        {onSeeOnMap && hasPin(listing.coordinates) && (
          <Button
            size="xs"
            variant="default"
            onClick={() => onSeeOnMap(listing.id)}
          >
            See on map
          </Button>
        )}
      </Group>
      {!canSave && (
        <Text size="xs">Favorite changes are unavailable in this view.</Text>
      )}
      {details && (
        <ListingDetails
          listing={listing}
          snapshot={snapshot}
          userId={userId}
          stale={stale}
          notes={notes}
        />
      )}
    </article>
  );
});
