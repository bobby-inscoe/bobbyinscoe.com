import {
  ActionIcon,
  Button,
  Group,
  Select,
  Spoiler,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  Component,
  lazy,
  type ReactNode,
  Suspense,
  useDeferredValue,
  useMemo,
  useState,
} from 'react';

import styles from '@/features/house-scanner/components/household-workspace.module.css';
import { ListingCard } from '@/features/house-scanner/components/listing-card';
import { ListingFilterPanel } from '@/features/house-scanner/components/listing-filter-panel';
import { ManualListingForm } from '@/features/house-scanner/components/manual-listing-form';
import { PinCard } from '@/features/house-scanner/components/pin-card';
import { ProfileEditor } from '@/features/house-scanner/components/profile-editor';
import {
  type LoadNotes,
  type SaveNote,
  useListingNotes,
} from '@/features/house-scanner/hooks/use-listing-notes';
import type {
  ManualSubmission,
  SearchProfile,
  Snapshot,
} from '@/features/house-scanner/types/contracts';
import {
  activeFilterCount,
  applyListingFilters,
  emptyFilters,
  isOnMap,
  type ListingFilters,
  listingHost,
} from '@/features/house-scanner/utils/listing-filters';
import { isListingStale } from '@/features/house-scanner/utils/listing-staleness';
import {
  readScanSummary,
  SCAN_STATUS_LABEL,
} from '@/features/house-scanner/utils/scan-summary';
import {
  formatDate,
  formatPrice,
  listingMatches,
  SECTION_LABELS,
} from '@/features/house-scanner/utils/workspace-view';

// Homes without a usable position share one marker here, in the water off Gothenburg.
const UNLOCATED_POSITION = { latitude: 57.69, longitude: 11.78 };

function compactPrice(sek: number) {
  if (sek < 1_000_000) return `${Math.round(sek / 1000)}k`;
  return `${(sek / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')}M`;
}

const LazyMap = lazy(() =>
  import('@/features/house-scanner/map/household-map').then((module) => ({
    default: module.HouseholdMap,
  })),
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
  onLoadNotes?: LoadNotes;
  onSaveNote?: SaveNote;
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
  const [tab, setTab] = useState<
    'suggestions' | 'favorites' | 'manual' | 'sources' | 'settings'
  >('suggestions');
  const [person, setPerson] = useState('everyone');
  const [section, setSection] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const duplicate = snapshot.listings.find(
    (listing) => listing.id === duplicateId,
  );
  const [view, setView] = useState<'list' | 'map'>('list');
  const [pending, setPending] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const member = snapshot.members.find((entry) => entry.userId === userId);
  const synthetic = snapshot.edition?.coverage === 'synthetic';
  const [filters, setFilters] = useState<ListingFilters>(emptyFilters);
  const [satellite, setSatellite] = useState(true);
  // Typing in a filter stays responsive while the list catches up.
  const deferredFilters = useDeferredValue(filters);
  const scoped = useMemo(
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
  const visible = useMemo(
    () => applyListingFilters(scoped, deferredFilters),
    [scoped, deferredFilters],
  );
  const filterHosts = useMemo(
    () => [...new Set(snapshot.listings.map(listingHost))],
    [snapshot.listings],
  );
  const points = useMemo(
    () =>
      visible.map((listing) => {
        const price = listing.conflicts.includes('askingPriceSek')
          ? 'Price disputed'
          : formatPrice(listing.facts.askingPriceSek);
        const status = listing.conflicts.includes('status')
          ? 'Status disputed'
          : listing.facts.status;
        return isOnMap(listing) && listing.coordinates
          ? {
              id: listing.id,
              coordinates: listing.coordinates,
              // Compact pin text; the label and card carry the full price or dispute.
              markerText:
                listing.facts.askingPriceSek === null ||
                listing.conflicts.includes('askingPriceSek')
                  ? '?'
                  : compactPrice(listing.facts.askingPriceSek),
              label: `${listing.title}: ${price} · ${status}`,
            }
          : {
              id: listing.id,
              coordinates: UNLOCATED_POSITION,
              markerText: '?',
              label: `${listing.title}: ${price} · ${status} · no known position`,
              unlocated: true,
            };
      }),
    [visible],
  );
  const notLocated = visible.filter((listing) => !isOnMap(listing)).length;
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
  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    for (const listing of snapshot.listings) {
      if (listing.origin !== 'source') continue;
      const host = new URL(listing.sourceUrls[0]).hostname;
      counts.set(host, (counts.get(host) ?? 0) + 1);
    }
    return [...counts].map(([host, homes]) => ({ host, homes }));
  }, [snapshot.listings]);
  const scanNotes = useMemo(
    () =>
      snapshot.edition ? readScanSummary(snapshot.edition.sourceSummary) : [],
    [snapshot.edition],
  );
  const editionAge = snapshot.edition
    ? Date.now() - Date.parse(snapshot.edition.publishedAt)
    : null;
  const stale = editionAge !== null && editionAge > 36 * 60 * 60 * 1000;
  return (
    <section className={styles.scope} aria-label="Household shortlist">
      <Text size="sm" c={stale ? 'red.8' : 'dimmed'} role="status">
        {synthetic
          ? 'Synthetic demo. Fictional homes and people; changes stay in memory.'
          : snapshot.edition
            ? `Updated ${formatDate(snapshot.edition.publishedAt)}${stale ? '. Over 36 hours old, so facts may be stale.' : ''}`
            : 'No data has been published yet.'}
      </Text>{' '}
      <Group component="nav" aria-label="Shortlist sections">
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
              stale={isListingStale(duplicate, snapshot.edition)}
              selected
              busy={pending.includes(duplicate.id)}
              canSave={canSave(duplicate.id)}
              notes={notes}
              onSelect={() => setDuplicateId(null)}
              onFavorite={() => void favorite(duplicate.id)}
            />
          )}
        </Stack>
      ) : tab === 'sources' ? (
        <Stack>
          <Title order={2}>Sources</Title>
          {sources.length === 0 ? (
            <Text>No source has delivered homes yet.</Text>
          ) : (
            sources.map((source) => {
              const matching = scanNotes.filter((scan) =>
                source.host.includes(scan.sourceId),
              );
              const notes = matching.length ? matching : scanNotes;
              return (
                <Stack key={source.host} gap="xs" component="section">
                  <Title order={3}>{source.host}</Title>
                  <Text size="sm">
                    {source.homes} {source.homes === 1 ? 'home' : 'homes'} ·
                    last scan{' '}
                    {snapshot.edition
                      ? formatDate(snapshot.edition.publishedAt)
                      : 'unknown'}
                    {notes[0] ? ` · ${SCAN_STATUS_LABEL[notes[0].status]}` : ''}
                  </Text>
                  {notes.length > 0 && (
                    <Spoiler
                      maxHeight={0}
                      showLabel="More about this scan"
                      hideLabel="Hide"
                    >
                      <Stack gap="xs">
                        {notes.map((scan) => (
                          <Text key={scan.sourceId} size="sm">
                            {scan.note}
                          </Text>
                        ))}
                      </Stack>
                    </Spoiler>
                  )}
                </Stack>
              );
            })
          )}
        </Stack>
      ) : tab === 'settings' ? (
        <Stack>
          <Title order={2}>Search criteria</Title>
          {synthetic && (
            <Text size="sm" c="dimmed">
              These criteria are fictional. Edits affect this demo only.
            </Text>
          )}
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
            <Text>No search profiles yet.</Text>
          )}
        </Stack>
      ) : (
        <>
          <Group align="flex-end" justify="space-between">
            <Stack gap="xs">
              <Title order={2}>
                {tab === 'favorites' ? 'Favorites' : 'Listings'}
              </Title>
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
              <Group gap="xs" align="flex-end" wrap="nowrap">
                <Select
                  label="Match"
                  value={section}
                  onChange={(value) => setSection(value ?? 'all')}
                  data={[
                    { value: 'all', label: 'All' },
                    ...Object.entries(SECTION_LABELS)
                      .filter(([value]) => value !== 'outside')
                      .map(([value, label]) => ({ value, label })),
                    { value: 'manual', label: 'Links we added' },
                  ]}
                  comboboxProps={{ withinPortal: false }}
                />
                <Tooltip
                  multiline
                  w={300}
                  events={{ hover: true, focus: true, touch: true }}
                  label={
                    <Stack gap={4}>
                      <Text size="xs">
                        Within budget: at or under your preferred price.
                      </Text>
                      <Text size="xs">
                        Stretch budget: over it, within your stretch limit.
                      </Text>
                      <Text size="xs">
                        Close to your criteria: misses one rule that can bend.
                      </Text>
                      <Text size="xs">
                        Missing info: facts are unknown, so it can’t be judged.
                      </Text>
                      <Text size="xs">
                        Links we added: pasted in by the household.
                      </Text>
                    </Stack>
                  }
                >
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="lg"
                    aria-label="What the match options mean"
                  >
                    ⓘ
                  </ActionIcon>
                </Tooltip>
              </Group>
            )}
          </Group>
          <ListingFilterPanel
            filters={filters}
            onChange={setFilters}
            hosts={filterHosts}
            shown={visible.length}
            total={scoped.length}
          />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {visible.length} homes
              {notLocated > 0 && ` · ${notLocated} not located`}
            </Text>
            <Group gap="xs" role="group" aria-label="View">
              <Button
                variant={view === 'list' ? 'filled' : 'default'}
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
              >
                List
              </Button>
              <Button
                variant={view === 'map' ? 'filled' : 'default'}
                aria-pressed={view === 'map'}
                onClick={() => setView('map')}
              >
                Map
              </Button>
            </Group>
          </Group>
          {!visible.length && (
            <Text>
              No homes here.
              {activeFilterCount(filters) > 0 &&
                ' Clear the filters to see more.'}
            </Text>
          )}
          {view === 'list' ? (
            <div className={styles.list}>
              {visible.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  snapshot={snapshot}
                  userId={userId}
                  selected={selectedId === listing.id}
                  stale={isListingStale(listing, snapshot.edition)}
                  details={selectedId === listing.id}
                  busy={pending.includes(listing.id)}
                  canSave={canSave(listing.id)}
                  notes={selectedId === listing.id ? notes : undefined}
                  onSelect={() =>
                    setSelectedId((current) =>
                      current === listing.id ? null : listing.id,
                    )
                  }
                  onSeeOnMap={() => {
                    setSelectedId(listing.id);
                    setView('map');
                  }}
                  onFavorite={() => void favorite(listing.id)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.mapPanel}>
              {visible.length ? (
                <MapLoadBoundary>
                  <Group gap="xs" role="group" aria-label="Basemap">
                    <Button
                      variant={satellite ? 'default' : 'filled'}
                      aria-pressed={!satellite}
                      onClick={() => setSatellite(false)}
                    >
                      Street map
                    </Button>
                    <Button
                      variant={satellite ? 'filled' : 'default'}
                      aria-pressed={satellite}
                      onClick={() => setSatellite(true)}
                    >
                      Satellite
                    </Button>
                  </Group>
                  <Suspense fallback={<Text role="status">Loading map…</Text>}>
                    <LazyMap
                      styleUrl={mapStyleUrl}
                      satellite={satellite}
                      points={points}
                      selectedId={selected?.id ?? null}
                      onSelect={setSelectedId}
                      overlay={
                        selected ? (
                          <PinCard
                            listing={selected}
                            onClose={() => setSelectedId(null)}
                            onDetails={() => setView('list')}
                          />
                        ) : null
                      }
                    />
                  </Suspense>
                </MapLoadBoundary>
              ) : (
                <Text>No homes to show.</Text>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
