import {
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  Component,
  lazy,
  type ReactNode,
  Suspense,
  useMemo,
  useState,
} from 'react';

import styles from '@/features/projects/features/house-scanner/components/household-workspace.module.css';
import { ListingCard } from '@/features/projects/features/house-scanner/components/listing-card';
import { ManualListingForm } from '@/features/projects/features/house-scanner/components/manual-listing-form';
import { ProfileEditor } from '@/features/projects/features/house-scanner/components/profile-editor';
import type {
  ManualSubmission,
  SearchProfile,
  Snapshot,
} from '@/features/projects/features/house-scanner/types/contracts';
import {
  formatDate,
  formatPrice,
  listingMatches,
  SECTION_LABELS,
} from '@/features/projects/features/house-scanner/utils/workspace-view';

const LazyMap = lazy(() =>
  import('@/features/projects/features/house-scanner/map/household-map').then(
    (module) => ({ default: module.HouseholdMap }),
  ),
);

class MapLoadBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Text role="alert">
        The map could not load. Use the listing controls and details below.
      </Text>
    ) : (
      this.props.children
    );
  }
}

export interface HouseholdWorkspaceProps {
  snapshot: Snapshot;
  userId: string;
  mapStyleUrl?: string;
  onSaveFavorite?: (listingId: string) => Promise<void>;
  onRemoveFavorite?: (listingId: string) => Promise<void>;
  onAddManual?: (submission: ManualSubmission) => Promise<void>;
  onSaveProfile?: (profile: SearchProfile) => Promise<void>;
}

export function HouseholdWorkspace({
  snapshot,
  userId,
  mapStyleUrl,
  onSaveFavorite,
  onRemoveFavorite,
  onAddManual,
  onSaveProfile,
}: HouseholdWorkspaceProps) {
  const [tab, setTab] = useState<
    'suggestions' | 'favorites' | 'manual' | 'settings'
  >('suggestions');
  const [person, setPerson] = useState('everyone');
  const [section, setSection] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const duplicate = snapshot.listings.find(
    (listing) => listing.id === duplicateId,
  );
  const [mapOpen, setMapOpen] = useState(false);
  const [narrowView, setNarrowView] = useState<'list' | 'map'>('list');
  const [pending, setPending] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const member = snapshot.members.find((entry) => entry.userId === userId);
  const synthetic = snapshot.edition?.coverage === 'synthetic';
  const visible = useMemo(
    () =>
      snapshot.listings.filter((listing) => {
        if (tab === 'favorites')
          return snapshot.favorites.some(
            (favorite) =>
              favorite.listingId === listing.id &&
              (person === 'everyone' ||
                favorite.userId === (person === 'mine' ? userId : person)),
          );
        if (listing.origin === 'manual')
          return section === 'all' || section === 'manual';
        if (section === 'manual') return false;
        return listingMatches(listing, snapshot).some(
          ({ result }) =>
            result.section !== 'outside' &&
            (section === 'all' || result.section === section),
        );
      }),
    [snapshot, tab, person, userId, section],
  );
  const points = useMemo(
    () =>
      visible.flatMap((listing) =>
        listing.coordinates &&
        listing.coordinates.precision !== 'approximate_area'
          ? [
              {
                id: listing.id,
                coordinates: listing.coordinates,
                markerText:
                  listing.facts.askingPriceSek === null ||
                  listing.conflicts.includes('askingPriceSek')
                    ? listing.conflicts.includes('askingPriceSek')
                      ? 'Price disputed'
                      : 'Price unknown'
                    : `${new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(listing.facts.askingPriceSek)} SEK`,
                label: `${listing.title}: ${listing.conflicts.includes('askingPriceSek') ? 'Price disputed' : formatPrice(listing.facts.askingPriceSek)} · ${listing.conflicts.includes('status') ? 'Status disputed' : listing.facts.status}`,
              },
            ]
          : [],
      ),
    [visible],
  );
  const selected = visible.find((listing) => listing.id === selectedId) ?? null;
  async function favorite(listingId: string) {
    const mine = snapshot.favorites.some(
      (entry) => entry.listingId === listingId && entry.userId === userId,
    );
    const action = mine ? onRemoveFavorite : onSaveFavorite;
    if (!action || pending.includes(listingId)) return;
    setPending((current) => [...current, listingId]);
    setMessage('');
    try {
      await action(listingId);
      setMessage(
        mine
          ? 'Your favorite was removed. Other members’ saves remain.'
          : 'Favorite saved.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not change your favorite. Try again.',
      );
    } finally {
      setPending((current) => current.filter((id) => id !== listingId));
    }
  }
  function canSave(listingId: string) {
    return Boolean(
      snapshot.favorites.some(
        (entry) => entry.listingId === listingId && entry.userId === userId,
      )
        ? onRemoveFavorite
        : onSaveFavorite,
    );
  }
  function openExisting(id: string) {
    setDuplicateId(id);
  }
  const editionAge = snapshot.edition
    ? Date.now() - Date.parse(snapshot.edition.publishedAt)
    : null;
  return (
    <section className={styles.scope} aria-label="Household shortlist">
      <Paper withBorder p="md">
        <Stack gap="xs">
          <Text fw={600}>
            {synthetic
              ? 'Synthetic demo. Fictional homes and people; changes stay in memory.'
              : `Household workspace · ${member?.displayName ?? 'Member'}`}
          </Text>
          <Text size="sm">
            {snapshot.edition
              ? `Edition ${formatDate(snapshot.edition.publishedAt)} · ${snapshot.edition.coverage} coverage`
              : 'No edition published.'}
          </Text>
          <Text size="sm">
            {snapshot.edition?.sourceSummary ??
              'No collection coverage is available.'}
          </Text>
          {synthetic ? (
            <Text size="sm">
              No live sources are connected. These examples do not represent
              market coverage.
            </Text>
          ) : (
            <Text size="sm">
              {editionAge === null
                ? 'Freshness unknown.'
                : editionAge > 36 * 60 * 60 * 1000
                  ? 'Edition is over 36 hours old. Facts may be stale.'
                  : 'Published within the past 36 hours. Listing facts may be older.'}{' '}
              Per-source collection status is not available in this snapshot.
            </Text>
          )}
        </Stack>
      </Paper>
      <Group component="nav" aria-label="Shortlist sections">
        {(['suggestions', 'favorites', 'manual', 'settings'] as const).map(
          (value) => (
            <Button
              key={value}
              variant={tab === value ? 'filled' : 'default'}
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
            >
              {value === 'manual'
                ? 'Add link'
                : value === 'settings'
                  ? 'Settings and status'
                  : value === 'favorites'
                    ? 'Favorites'
                    : 'Suggestions'}
            </Button>
          ),
        )}
      </Group>
      <Text role="status" aria-live="polite">
        {message}
      </Text>
      {tab === 'manual' ? (
        <Stack>
          <ManualListingForm
            snapshot={snapshot}
            onAdd={onAddManual}
            onExisting={openExisting}
          />
          {duplicate && (
            <ListingCard
              listing={duplicate}
              snapshot={snapshot}
              userId={userId}
              details
              selected
              busy={pending.includes(duplicate.id)}
              canSave={canSave(duplicate.id)}
              onSelect={() => setDuplicateId(null)}
              onFavorite={() => void favorite(duplicate.id)}
            />
          )}
        </Stack>
      ) : tab === 'settings' ? (
        <Stack>
          <Title order={2}>Search criteria and status</Title>
          <Text>
            {synthetic
              ? 'These criteria are fictional. Edits affect this demo only.'
              : 'Shared profiles belong to this household. Existing favorites remain when criteria change.'}
          </Text>
          {snapshot.profiles.length ? (
            snapshot.profiles.map((profile) => (
              <ProfileEditor
                key={`${profile.id}:${profile.revision}`}
                profile={profile}
                canEdit={member?.role === 'owner'}
                onSave={onSaveProfile}
              />
            ))
          ) : (
            <Text>
              No search profiles are configured. No defaults have been applied.
            </Text>
          )}
          <Text>
            Source collection and optional digests are not configured by this
            screen. Map availability is independent of listing freshness.
          </Text>
        </Stack>
      ) : (
        <>
          <Group align="flex-end" justify="space-between">
            <Stack gap="xs">
              <Title order={2}>
                {tab === 'favorites' ? 'Shared favorites' : 'Suggestions'}
              </Title>
              <Text size="sm">
                {tab === 'favorites'
                  ? 'One home per card, with each member’s save shown.'
                  : 'Potential matches across enabled profiles. Suggestions do not indicate buyer interest.'}
              </Text>
            </Stack>
            {tab === 'favorites' ? (
              <Select
                label="Saved by"
                value={person}
                onChange={(value) => setPerson(value ?? 'everyone')}
                data={[
                  { value: 'everyone', label: 'Everyone' },
                  { value: 'mine', label: 'Mine' },
                  ...snapshot.members.map((entry) => ({
                    value: entry.userId,
                    label: entry.displayName,
                  })),
                ]}
                comboboxProps={{ withinPortal: false }}
              />
            ) : (
              <Select
                label="Suggestion section"
                value={section}
                onChange={(value) => setSection(value ?? 'all')}
                data={[
                  { value: 'all', label: 'All suggestions and manual links' },
                  ...Object.entries(SECTION_LABELS)
                    .filter(([value]) => value !== 'outside')
                    .map(([value, label]) => ({ value, label })),
                  { value: 'manual', label: 'Added by household' },
                ]}
                comboboxProps={{ withinPortal: false }}
              />
            )}
          </Group>
          <Group>
            <Text size="sm">
              {visible.length} homes · {visible.length - points.length} list
              only (unknown or approximate location)
            </Text>
            <Button
              variant="default"
              onClick={() => {
                setMapOpen(!mapOpen);
                setNarrowView(mapOpen ? 'list' : 'map');
              }}
            >
              {mapOpen ? 'Close map' : 'Open map'}
            </Button>
          </Group>
          {mapOpen && (
            <div className={styles.viewSwitch}>
              <Button
                variant={narrowView === 'list' ? 'filled' : 'default'}
                onClick={() => setNarrowView('list')}
              >
                List
              </Button>
              <Button
                variant={narrowView === 'map' ? 'filled' : 'default'}
                onClick={() => setNarrowView('map')}
              >
                Map
              </Button>
            </div>
          )}
          {!visible.length && (
            <Text>
              No homes in this view. Change the filter or add a listing link.
            </Text>
          )}
          <div className={`${styles.panels} ${mapOpen ? styles.withMap : ''}`}>
            <div
              className={`${styles.list} ${mapOpen && narrowView === 'map' ? styles.hideNarrow : ''}`}
            >
              {visible.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  snapshot={snapshot}
                  userId={userId}
                  selected={selectedId === listing.id}
                  details={!mapOpen && selectedId === listing.id}
                  busy={pending.includes(listing.id)}
                  canSave={canSave(listing.id)}
                  onSelect={() => {
                    setSelectedId(listing.id);
                    if (mapOpen) setNarrowView('map');
                  }}
                  onFavorite={() => void favorite(listing.id)}
                />
              ))}
            </div>
            {mapOpen && (
              <div
                className={`${styles.mapPanel} ${narrowView === 'list' ? styles.hideNarrow : ''}`}
              >
                {points.length ? (
                  <MapLoadBoundary>
                    <Suspense
                      fallback={<Text role="status">Loading map module…</Text>}
                    >
                      <LazyMap
                        styleUrl={mapStyleUrl}
                        points={points}
                        selectedId={selected?.id ?? null}
                        onSelect={setSelectedId}
                      />
                    </Suspense>
                  </MapLoadBoundary>
                ) : (
                  <Text>
                    No usable positions in this view. Unknown and approximate
                    locations remain list only.
                  </Text>
                )}
                {selected ? (
                  <ListingCard
                    listing={selected}
                    snapshot={snapshot}
                    userId={userId}
                    selected
                    details
                    busy={pending.includes(selected.id)}
                    canSave={canSave(selected.id)}
                    onSelect={() => setNarrowView('list')}
                    onFavorite={() => void favorite(selected.id)}
                  />
                ) : (
                  <Text>Select a listing or map point to see its details.</Text>
                )}
                <Button
                  variant="default"
                  onClick={() => {
                    setMapOpen(false);
                    setNarrowView('list');
                  }}
                >
                  Use list only
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
