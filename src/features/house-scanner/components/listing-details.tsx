import { Anchor, Paper, Stack, Text, Title } from '@mantine/core';

import styles from '@/features/house-scanner/components/household-workspace.module.css';
import { ListingNotes } from '@/features/house-scanner/components/listing-notes';
import type { ListingNotesController } from '@/features/house-scanner/hooks/use-listing-notes';
import type {
  Listing,
  Snapshot,
} from '@/features/house-scanner/types/contracts';
import { formatDate, formatPrice } from '@/features/house-scanner/utils/format';
import { hasPin } from '@/features/house-scanner/utils/listing-position';

interface ListingDetailsProps {
  listing: Listing;
  snapshot: Snapshot;
  userId: string;
  stale?: boolean;
  notes?: ListingNotesController;
}

export function ListingDetails({
  listing,
  snapshot,
  userId,
  stale,
  notes,
}: ListingDetailsProps) {
  return (
    <>
      {stale && (
        <Paper
          withBorder
          p="sm"
          role="note"
          aria-label="Not seen in the latest scan"
        >
          <Text size="sm">
            Not seen in the latest scan. Last seen{' '}
            {formatDate(listing.observedAt)}. The source page may have changed
            or been removed, so open it to check.
          </Text>
        </Paper>
      )}
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
      {listing.conflicts.length > 0 && (
        <Text size="sm">
          Conflicting fields: {listing.conflicts.join(', ')}
        </Text>
      )}
      <Text size="sm">
        Location:{' '}
        {listing.coordinates
          ? `${listing.coordinates.precision.replaceAll('_', ' ')}; ${listing.coordinates.source}; observed ${formatDate(listing.coordinates.observedAt)}`
          : 'Unknown; list only'}
      </Text>
      {listing.coordinates && !hasPin(listing.coordinates) && (
        <Text size="sm">Approximate area; no exact pin is shown.</Text>
      )}
      <Text size="sm">Last observed: {formatDate(listing.observedAt)}</Text>
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
      <Title order={4}>Notes</Title>
      <ListingNotes
        controller={notes}
        members={snapshot.members}
        userId={userId}
      />
    </>
  );
}
