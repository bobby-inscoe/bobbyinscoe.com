import {
  Anchor,
  Badge,
  Button,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';

import styles from '@/features/house-scanner/components/household-workspace.module.css';
import type {
  Listing,
  Snapshot,
} from '@/features/house-scanner/types/contracts';
import {
  formatDate,
  formatPrice,
  listingMatches,
  SECTION_LABELS,
} from '@/features/house-scanner/utils/workspace-view';

export function ListingPhoto({ listing }: { listing: Listing }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photo = listing.photo;
  if (
    !photo ||
    failedUrl === photo.url ||
    Date.parse(photo.expiresAt) <= Date.now()
  )
    return (
      <div className={styles.placeholder}>No permitted photo available</div>
    );
  return (
    <Stack gap="xs">
      <img
        className={styles.photo}
        src={photo.url}
        alt={listing.title}
        loading="lazy"
        referrerPolicy="no-referrer"
        width={400}
        height={180}
        onError={() => setFailedUrl(photo.url)}
      />
      <Text size="xs">{photo.attribution}</Text>
    </Stack>
  );
}

interface ListingCardProps {
  listing: Listing;
  snapshot: Snapshot;
  userId: string;
  selected?: boolean;
  details?: boolean;
  busy: boolean;
  canSave: boolean;
  onSelect: () => void;
  onFavorite: () => void;
}

export function ListingCard({
  listing,
  snapshot,
  userId,
  selected,
  details,
  busy,
  canSave,
  onSelect,
  onFavorite,
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
  const memberName = (id: string | null) =>
    snapshot.members.find((member) => member.userId === id)?.displayName ||
    'Household member';
  return (
    <article
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      aria-label={listing.title}
    >
      <ListingPhoto listing={listing} />
      <Group gap="xs">
        <Badge variant="light">
          {listing.conflicts.includes('status')
            ? 'Status disputed'
            : listing.facts.status}
        </Badge>
        {listing.origin === 'manual' && (
          <Badge variant="outline">
            Added by {memberName(listing.addedBy)}
          </Badge>
        )}
      </Group>
      <Title order={3}>{listing.title}</Title>
      <Text>
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
      <Text size="sm">
        {listing.facts.livingAreaM2 ?? 'Unknown'} m²
        {listing.conflicts.includes('livingAreaM2') && ' (disputed)'} ·{' '}
        {listing.facts.rooms ?? 'Unknown'} rooms
        {listing.conflicts.includes('rooms') && ' (disputed)'} ·{' '}
        {listing.facts.propertyType ?? 'Type unknown'}
        {listing.conflicts.includes('propertyType') && ' (disputed)'}
      </Text>
      {matches.map(({ profile, result }) => (
        <Stack key={profile.id} gap={4}>
          <Text size="sm" fw={600}>
            {profile.name}: {SECTION_LABELS[result.section]}
          </Text>
          <Text size="sm">{result.reasons.join('; ')}</Text>
          <Text size="sm">
            {(details ? result.caveats : result.caveats.slice(0, 3)).join('; ')}
          </Text>
        </Stack>
      ))}
      {matches.length === 0 && (
        <Text size="sm">
          No enabled search profiles. This home has not been matched.
        </Text>
      )}
      <Text size="sm">
        Saved by:{' '}
        {saved.map((favorite) => memberName(favorite.userId)).join(', ') ||
          'Nobody'}
      </Text>
      <Group>
        <Anchor
          href={listing.sourceUrls[0]}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
        >
          Open original listing
        </Anchor>
        <Button
          size="xs"
          variant="default"
          onClick={onSelect}
          aria-pressed={selected}
        >
          Details
        </Button>
        <Button
          size="xs"
          disabled={!canSave}
          loading={busy}
          onClick={onFavorite}
        >
          {mine ? 'Remove my favorite' : 'Save favorite'}
        </Button>
      </Group>
      {!canSave && (
        <Text size="xs">Favorite changes are unavailable in this view.</Text>
      )}
      {details && (
        <>
          <Title order={4}>Facts and source evidence</Title>
          <div className={styles.facts}>
            {listing.facts.propertyType === 'house' ? (
              <Text size="sm">House operating costs are unavailable.</Text>
            ) : (
              <>
                <Text size="sm">
                  Base monthly fee: {formatPrice(listing.facts.baseFeeSek)}
                </Text>
                <Text size="sm">
                  Mandatory monthly additions:{' '}
                  {formatPrice(listing.facts.mandatoryMonthlySek)}
                </Text>
              </>
            )}
            <Text size="sm">
              Lift:{' '}
              {listing.facts.lift === null
                ? 'Unknown'
                : listing.facts.lift
                  ? 'Yes'
                  : 'No'}
            </Text>
            <Text size="sm">
              Outdoor space: {listing.facts.outdoor ?? 'Unknown'}
            </Text>
            <Text size="sm">
              Municipality: {listing.facts.municipality ?? 'Unknown'}
            </Text>
            <Text size="sm">
              Glazing:{' '}
              {listing.facts.glazed === null
                ? 'Unknown'
                : listing.facts.glazed
                  ? 'Yes'
                  : 'No'}
            </Text>
          </div>
          <Text size="sm">
            {listing.conflicts.length
              ? `Conflicting fields: ${listing.conflicts.join(', ')}`
              : 'No reported field conflicts.'}
          </Text>
          <Text size="sm">
            Location:{' '}
            {listing.coordinates
              ? `${listing.coordinates.precision.replaceAll('_', ' ')}; ${listing.coordinates.source}; observed ${formatDate(listing.coordinates.observedAt)}`
              : 'Unknown; list only'}
          </Text>
          {listing.coordinates?.precision === 'approximate_area' && (
            <Text size="sm">Approximate area; no exact pin is shown.</Text>
          )}
          <Text size="sm">
            Last observed: {formatDate(listing.observedAt)}. A missing later
            observation does not prove sale or withdrawal.
          </Text>
          {listing.sourceUrls.map((url) => (
            <Anchor
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              {new URL(url).hostname}: original listing
            </Anchor>
          ))}
          {listing.userTags.length > 0 && (
            <Text size="sm">User tags: {listing.userTags.join(', ')}</Text>
          )}
          {listing.evidence.length ? (
            listing.evidence.map((evidence) => (
              <Stack key={evidence.id} gap={4}>
                <Text size="sm">
                  {evidence.kind.replaceAll('_', ' ')} ·{' '}
                  {evidence.subject.replaceAll('_', ' ')}: {evidence.summary}
                </Text>
                <Text size="xs">
                  {formatDate(evidence.observedAt)}
                  {evidence.method ? ` · ${evidence.method}` : ''}
                </Text>
                {evidence.sourceUrl && (
                  <Anchor
                    size="sm"
                    href={evidence.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Evidence source
                  </Anchor>
                )}
              </Stack>
            ))
          ) : (
            <Text size="sm">
              No supporting nature, transit or other evidence recorded.
            </Text>
          )}
          <Text size="sm">
            {snapshot.edition?.coverage === 'synthetic'
              ? 'Demo notes appear as fictional buyer observations above. Note editing is unavailable.'
              : 'Shared note display and editing are not connected to this snapshot.'}
          </Text>
        </>
      )}
    </article>
  );
}
