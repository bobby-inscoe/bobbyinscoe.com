import { Button, Group, Text } from '@mantine/core';
import { useDeferredValue, useMemo, useState } from 'react';

import { AddLinkPanel } from '@/features/house-scanner/components/add-link-panel';
import styles from '@/features/house-scanner/components/household-workspace.module.css';
import { ListingsPanel } from '@/features/house-scanner/components/listings-panel';
import { SettingsPanel } from '@/features/house-scanner/components/settings-panel';
import { SourcesPanel } from '@/features/house-scanner/components/sources-panel';
import { useFavoriteToggle } from '@/features/house-scanner/hooks/use-favorite-toggle';
import { useListingNotes } from '@/features/house-scanner/hooks/use-listing-notes';
import type { Snapshot } from '@/features/house-scanner/types/contracts';
import type {
  HouseholdActions,
  WorkspaceTab,
} from '@/features/house-scanner/types/household';
import { formatDate } from '@/features/house-scanner/utils/format';
import {
  applyListingFilters,
  emptyFilters,
  type ListingFilters,
  listingHost,
} from '@/features/house-scanner/utils/listing-filters';
import { scopeListings } from '@/features/house-scanner/utils/listing-view';

// Any action may be missing, which turns its control off.
export interface HouseholdWorkspaceProps extends Partial<HouseholdActions> {
  snapshot: Snapshot;
  userId: string;
  mapStyleUrl?: string;
}

export function HouseholdWorkspace({
  snapshot,
  userId,
  mapStyleUrl,
  onSaveFavorite,
  onRemoveFavorite,
  onAddManual,
  onSaveProfile,
  onLoadNotes,
  onSaveNote,
}: HouseholdWorkspaceProps) {
  const [tab, setTab] = useState<WorkspaceTab>('suggestions');
  const [person, setPerson] = useState('everyone');
  const [section, setSection] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const duplicate = snapshot.listings.find(
    (listing) => listing.id === duplicateId,
  );
  const [view, setView] = useState<'list' | 'map'>('list');
  const { pending, message, favorite, canSave } = useFavoriteToggle({
    snapshot,
    userId,
    onSaveFavorite,
    onRemoveFavorite,
  });
  const synthetic = snapshot.edition?.coverage === 'synthetic';
  const [filters, setFilters] = useState<ListingFilters>(emptyFilters);
  const [satellite, setSatellite] = useState(true);
  // Typing in a filter stays responsive while the list catches up.
  const deferredFilters = useDeferredValue(filters);
  const scoped = useMemo(
    () => scopeListings(snapshot, { tab, person, section, userId }),
    [snapshot, tab, person, userId, section],
  );
  const visible = useMemo(
    () => applyListingFilters(scoped, deferredFilters),
    [scoped, deferredFilters],
  );
  const filterHosts = useMemo(
    () => [...new Set(snapshot.listings.map(listingHost))],
    [snapshot.listings],
  );
  const selected = visible.find((listing) => listing.id === selectedId) ?? null;
  // At most one card shows details at a time, so one controller serves them all.
  const notesListingId =
    tab === 'manual' ? (duplicate?.id ?? null) : (selected?.id ?? null);
  const notes = useListingNotes({
    listingId: tab === 'settings' || tab === 'sources' ? null : notesListingId,
    userId,
    onLoad: onLoadNotes,
    onSave: onSaveNote,
  });
  const editionAge = snapshot.edition
    ? Date.now() - Date.parse(snapshot.edition.publishedAt)
    : null;
  const stale = editionAge !== null && editionAge > 36 * 60 * 60 * 1000;
  return (
    <section className={styles.scope} aria-label="Household shortlist">
      {/* The demo's fixed edition date is always old, so only real editions warn. */}
      <Text
        size="sm"
        c={stale && !synthetic ? 'red.8' : 'dimmed'}
        role="status"
      >
        {synthetic
          ? 'Synthetic demo. Fictional homes and people; changes stay in memory.'
          : snapshot.edition
            ? `Updated ${formatDate(snapshot.edition.publishedAt)}${stale ? '. Over 36 hours old, so facts may be stale.' : ''}`
            : 'No data has been published yet.'}
      </Text>{' '}
      <Group
        component="nav"
        aria-label="Shortlist sections"
        className={styles.tabs}
        wrap="nowrap"
        // Room for the focus ring, which the scroll container would otherwise clip.
        p={4}
      >
        {(synthetic
          ? (['suggestions', 'favorites', 'manual', 'settings'] as const)
          : ([
              'suggestions',
              'favorites',
              'manual',
              'sources',
              'settings',
            ] as const)
        ).map((value) => (
          <Button
            key={value}
            variant={tab === value ? 'filled' : 'default'}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {value === 'manual'
              ? 'Add link'
              : value === 'sources'
                ? 'Sources'
                : value === 'settings'
                  ? 'Settings'
                  : value === 'favorites'
                    ? 'Favorites'
                    : 'Listings'}
          </Button>
        ))}
      </Group>
      <Text role="status" aria-live="polite">
        {message}
      </Text>
      {tab === 'manual' ? (
        <AddLinkPanel
          snapshot={snapshot}
          userId={userId}
          duplicate={duplicate}
          pending={pending}
          canSave={canSave}
          notes={notes}
          onAddManual={onAddManual}
          onExisting={setDuplicateId}
          onCloseDuplicate={() => setDuplicateId(null)}
          onFavorite={favorite}
        />
      ) : tab === 'sources' ? (
        <SourcesPanel snapshot={snapshot} />
      ) : tab === 'settings' ? (
        <SettingsPanel
          snapshot={snapshot}
          userId={userId}
          synthetic={synthetic}
          onSaveProfile={onSaveProfile}
        />
      ) : (
        <ListingsPanel
          tab={tab}
          snapshot={snapshot}
          userId={userId}
          mapStyleUrl={mapStyleUrl}
          person={person}
          onPersonChange={setPerson}
          section={section}
          onSectionChange={setSection}
          filters={filters}
          onFiltersChange={setFilters}
          filterHosts={filterHosts}
          total={scoped.length}
          visible={visible}
          selected={selected}
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          view={view}
          onViewChange={setView}
          satellite={satellite}
          onSatelliteChange={setSatellite}
          pending={pending}
          canSave={canSave}
          notes={notes}
          onFavorite={favorite}
        />
      )}
    </section>
  );
}
