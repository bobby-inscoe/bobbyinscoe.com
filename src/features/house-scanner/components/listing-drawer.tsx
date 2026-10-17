import { Button, Drawer, Group, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { FavoriteStar } from '@/features/house-scanner/components/favorite-star';
import { HideButton } from '@/features/house-scanner/components/hide-button';
import styles from '@/features/house-scanner/components/household-workspace.module.css';
import { ListingDetails } from '@/features/house-scanner/components/listing-details';
import { ListingPhoto } from '@/features/house-scanner/components/listing-photo';
import {
  FactsLine,
  MatchLines,
  OriginalListingButton,
  PriceLine,
  ReasonChips,
} from '@/features/house-scanner/components/listing-summary';
import type { ListingNotesController } from '@/features/house-scanner/hooks/use-listing-notes';
import type {
  Listing,
  Snapshot,
} from '@/features/house-scanner/types/contracts';
import { hasPin } from '@/features/house-scanner/utils/listing-position';

interface ListingDrawerProps {
  // Null while no home is selected; the drawer stays mounted so Mantine can return focus on close.
  listing: Listing | null;
  snapshot: Snapshot;
  userId: string;
  opened: boolean;
  stale?: boolean;
  hidden: boolean;
  // The member's own favorite of this home.
  favorite: { mine: boolean; canSave: boolean; busy: boolean };
  notes: ListingNotesController;
  onToggleHidden: (listingId: string) => void;
  onFavorite: (listingId: string) => void;
  onClose: () => void;
  onSeeOnMap: () => void;
}

// A side sheet on wide screens and a bottom sheet on narrow ones.
export function ListingDrawer({
  listing,
  snapshot,
  userId,
  opened,
  stale,
  hidden,
  favorite,
  notes,
  onToggleHidden,
  onFavorite,
  onClose,
  onSeeOnMap,
}: ListingDrawerProps) {
  const wide = useMediaQuery('(min-width: 48em)');
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={listing?.title}
      position={wide ? 'right' : 'bottom'}
      size={wide ? 'lg' : '85%'}
      // Rendered in place so the feature's scoped CSS variables still apply.
      withinPortal={false}
      classNames={{
        root: styles.drawerRoot,
        inner: styles.drawerInner,
        title: styles.drawerTitle,
      }}
    >
      {listing && (
        <Stack gap="sm" className={styles.drawerBody}>
          <div className={styles.photoWrap}>
            <ListingPhoto listing={listing} />
            <HideButton
              listingId={listing.id}
              hidden={hidden}
              onToggle={onToggleHidden}
            />
            <FavoriteStar
              {...favorite}
              onToggle={() => onFavorite(listing.id)}
            />
          </div>
          <PriceLine listing={listing} />
          <FactsLine listing={listing} />
          <ReasonChips listing={listing} snapshot={snapshot} />
          <MatchLines listing={listing} snapshot={snapshot} details />
          <Group>
            <OriginalListingButton listing={listing} />
            {hasPin(listing.coordinates) && (
              <Button size="xs" variant="default" onClick={onSeeOnMap}>
                See on map
              </Button>
            )}
          </Group>
          <ListingDetails
            listing={listing}
            snapshot={snapshot}
            userId={userId}
            stale={stale}
            notes={notes}
            headingOrder={3}
          />
        </Stack>
      )}
    </Drawer>
  );
}
