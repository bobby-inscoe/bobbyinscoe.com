import { Badge, Button, Group, Text } from '@mantine/core';
import { useDeferredValue, useMemo, useState } from 'react';

import { AddLinkPanel } from '@/features/house-scanner/components/add-link-panel';
import styles from '@/features/house-scanner/components/household-workspace.module.css';
import { ListingsPanel } from '@/features/house-scanner/components/listings-panel';
import { SettingsPanel } from '@/features/house-scanner/components/settings-panel';
import { SourcesPanel } from '@/features/house-scanner/components/sources-panel';
import {
  favoriteViewings,
  ViewingsPanel,
} from '@/features/house-scanner/components/viewings-panel';
import { useFavoriteToggle } from '@/features/house-scanner/hooks/use-favorite-toggle';
import { useHiddenListings } from '@/features/house-scanner/hooks/use-hidden-listings';
import { useListingNotes } from '@/features/house-scanner/hooks/use-listing-notes';
import type { Snapshot } from '@/features/house-scanner/types/contracts';
import type {
  HouseholdActions,
  WorkspaceTab,
} from '@/features/house-scanner/types/household';
import { findDuplicates } from '@/features/house-scanner/utils/duplicates';
import { formatDate } from '@/features/house-scanner/utils/format';
import {
  applyListingFilters,
  emptyFilters,
  type ListingFilters,
  listingHost,
} from '@/features/house-scanner/utils/listing-filters';
import { scopeListings } from '@/features/house-scanner/utils/listing-view';
import { viewingsWithin } from '@/features/house-scanner/utils/viewings';

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
  onSetHidden,
  onLoadNotes,
  onSaveNote,
}: HouseholdWorkspaceProps) {
  const [tab, setTab] = useState<WorkspaceTab>('suggestions');
  const [person, setPerson] = useState('everyone');
  const [section, setSection] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
  // Personal to the member: the database keeps them, and the demo keeps them in memory.
  const { hidden, hide, unhide } = useHiddenListings({
    snapshot,
    userId,
    persist: !synthetic,
    onSetHidden,
  });
  const { hidden: duplicateIds, alsoOn } = useMemo(
    () => findDuplicates(snapshot),
    [snapshot],
  );
  const visible = useMemo(
    () => applyListingFilters(scoped, deferredFilters, hidden, duplicateIds),
    [scoped, deferredFilters, hidden, duplicateIds],
  );
  // Cross-posted copies the filters leave out, so the count line can say they were folded.
  const duplicateCount = useMemo(
    () =>
      deferredFilters.showDuplicates
        ? 0
        : applyListingFilters(
            scoped,
            { ...deferredFilters, showDuplicates: true },
            hidden,
          ).length - visible.length,
    [scoped, deferredFilters, hidden, visible],
  );
  // Hidden homes the filters leave out, so the count line can say they exist.
  const hiddenCount = useMemo(
    () =>
      deferredFilters.hidden === 'not-hidden'
        ? applyListingFilters(
            scoped,
            { ...deferredFilters, hidden: 'hidden-only' },
            hidden,
            duplicateIds,
          ).length
        : 0,
    [scoped, deferredFilters, hidden, duplicateIds],
  );
  // Saved homes with a viewing in the next two days, for the badge on the tab.
  const viewingsSoon = useMemo(() => {
    const now = Date.now();
    return viewingsWithin(
      favoriteViewings(snapshot, 'everyone', userId, now),
      48,
      now,
    );
  }, [snapshot, userId]);
  const filterHosts = useMemo(
    () => [...new Set(snapshot.listings.map(listingHost))],
    [snapshot.listings],
  );
  const selected = visible.find((listing) => listing.id === selectedId) ?? null;
  // At most one card shows details at a time, so one controller serves them all.
  const notesListingId =
    tab === 'manual' ? (duplicate?.id ?? null) : (selected?.id ?? null);
  const notes = useListingNotes({
    listingId:
      tab === 'settings' || tab === 'sources' || tab === 'viewings'
        ? null
        : notesListingId,
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
          ? ([
              'suggestions',
              'favorites',
              'viewings',
              'manual',
              'settings',
            ] as const)
          : ([
              'suggestions',
              'favorites',
              'viewings',
              'manual',
              'sources',
              'settings',
            ] as const)
        ).map((value) => (
          <Button
            key={value}
            variant={tab === value ? 'filled' : 'default'}
            aria-pressed={tab === value}
            onClick={() => {
              setTab(value);
              setDetailsOpen(false);
            }}
          >
            {value === 'viewings' ? (
              <>
                Viewings
                {viewingsSoon > 0 && (
                  <Badge
                    ml={6}
                    size="sm"
                    variant="light"
                    aria-label={`${viewingsSoon} saved ${viewingsSoon === 1 ? 'viewing' : 'viewings'} in the next 48 hours`}
                  >
                    {viewingsSoon}
                  </Badge>
                )}
              </>
            ) : value === 'manual' ? (
              'Add link'
            ) : value === 'sources' ? (
              'Sources'
            ) : value === 'settings' ? (
              'Settings'
            ) : value === 'favorites' ? (
              'Favorites'
            ) : (
              'Listings'
            )}
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
      ) : tab === 'viewings' ? (
        <ViewingsPanel snapshot={snapshot} userId={userId} />
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
          hiddenIds={hidden}
          hiddenCount={hiddenCount}
          duplicateCount={duplicateCount}
          alsoOn={alsoOn}
          onHide={hide}
          onUnhide={unhide}
          onFiltersChange={setFilters}
          filterHosts={filterHosts}
          total={scoped.length}
          visible={visible}
          selected={selected}
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          detailsOpen={detailsOpen}
          onDetailsOpenChange={setDetailsOpen}
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
