import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';

import styles from '@/features/house-scanner/components/household-workspace.module.css';
import { ListingDetails } from '@/features/house-scanner/components/listing-details';
import { ListingPhoto } from '@/features/house-scanner/components/listing-photo';
import type { ListingNotesController } from '@/features/house-scanner/hooks/use-listing-notes';
import type {
  Listing,
  Snapshot,
} from '@/features/house-scanner/types/contracts';
import { formatPrice } from '@/features/house-scanner/utils/format';
import { hasPin } from '@/features/house-scanner/utils/listing-position';
import {
  listingMatches,
  SECTION_LABELS,
} from '@/features/house-scanner/utils/match-listing';

interface ListingCardProps {
  listing: Listing;
  snapshot: Snapshot;
  userId: string;
  selected?: boolean;
  details?: boolean;
  stale?: boolean;
  busy: boolean;
  canSave: boolean;
  notes?: ListingNotesController;
  onSelect: () => void;
  onFavorite: () => void;
  // Shown only for homes that have a pin.
  onSeeOnMap?: () => void;
}

export function ListingCard({
  listing,
  snapshot,
  userId,
  selected,
  details,
  stale,
  busy,
  canSave,
  notes,
  onSelect,
  onFavorite,
  onSeeOnMap,
}: ListingCardProps) {
  const saved = snapshot.favorites.filter(
    (favorite) => favorite.listingId === listing.id,
  );
  const mine = saved.some((favorite) => favorite.userId === userId);
  const matches = listingMatches(listing, snapshot);
  const current = listing.facts.askingPriceSek;
  const previous = listing.previousAskingPriceSek;
  const changed =
    previous !== null &&
    current !== null &&
    previous !== current &&
    !listing.conflicts.includes('askingPriceSek');
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
        <ActionIcon
          className={styles.star}
          variant={mine ? 'filled' : 'default'}
          color="moss"
          size="lg"
          radius="xl"
          aria-label={mine ? 'Remove my favorite' : 'Save favorite'}
          disabled={!canSave}
          loading={busy}
          onClick={onFavorite}
        >
          {mine ? '★' : '☆'}
        </ActionIcon>
      </div>
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
      <Title order={3} size="h5" lineClamp={1}>
        {listing.title}
      </Title>
      <Text size="sm" c="dimmed">
        {listing.facts.livingAreaM2 ?? 'Unknown'} m²
        {listing.conflicts.includes('livingAreaM2') && ' (disputed)'} ·{' '}
        {listing.facts.rooms ?? 'Unknown'} rooms
        {listing.conflicts.includes('rooms') && ' (disputed)'} ·{' '}
        {listing.facts.propertyType ?? 'Type unknown'}
        {listing.conflicts.includes('propertyType') && ' (disputed)'}
      </Text>
      {(showStatus || listing.origin === 'manual' || stale) && (
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
        </Group>
      )}
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
      {saved.length > 0 && (
        <Text size="sm">
          Saved by{' '}
          {saved.map((favorite) => memberName(favorite.userId)).join(', ')}
        </Text>
      )}
      <div className={styles.grow} />
      <Group>
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
        <Button
          size="xs"
          variant="default"
          onClick={onSelect}
          aria-pressed={selected}
        >
          Details
        </Button>
        {onSeeOnMap && hasPin(listing.coordinates) && (
          <Button size="xs" variant="default" onClick={onSeeOnMap}>
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
}
