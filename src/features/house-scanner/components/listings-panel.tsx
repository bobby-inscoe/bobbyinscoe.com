import {
  ActionIcon,
  Badge,
  Button,
  Flex,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  Component,
  type Dispatch,
  lazy,
  type ReactNode,
  type SetStateAction,
  Suspense,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import styles from '@/features/house-scanner/components/household-workspace.module.css';
import { ListingCard } from '@/features/house-scanner/components/listing-card';
import { ListingDrawer } from '@/features/house-scanner/components/listing-drawer';
import { ListingFilterPanel } from '@/features/house-scanner/components/listing-filter-panel';
import { PinCard } from '@/features/house-scanner/components/pin-card';
import type { ListingNotesController } from '@/features/house-scanner/hooks/use-listing-notes';
import type {
  Listing,
  Snapshot,
} from '@/features/house-scanner/types/contracts';
import {
  activeFilterCount,
  type ListingFilters,
} from '@/features/house-scanner/utils/listing-filters';
import { hasPin } from '@/features/house-scanner/utils/listing-position';
import { isListingStale } from '@/features/house-scanner/utils/listing-staleness';
import { mapPoints } from '@/features/house-scanner/utils/listing-view';
import { MATCH_CHOICES } from '@/features/house-scanner/utils/match-listing';

const LazyMap = lazy(() =>
  import('@/features/house-scanner/components/household-map').then(
    (module) => ({
      default: module.HouseholdMap,
    }),
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

interface ListingsPanelProps {
  tab: 'suggestions' | 'favorites';
  snapshot: Snapshot;
  userId: string;
  mapStyleUrl?: string;
  person: string;
  onPersonChange: (person: string) => void;
  section: string;
  onSectionChange: (section: string) => void;
  filters: ListingFilters;
  // This member's hidden homes, which stay out of view unless the filter says otherwise.
  hiddenIds: ReadonlySet<string>;
  // How many hidden homes the current filters keep out of view.
  hiddenCount: number;
  onHide: (listingId: string) => void;
  onUnhide: (listingId: string) => void;
  onFiltersChange: (filters: ListingFilters) => void;
  filterHosts: string[];
  // How many homes the tab holds before the filters apply.
  total: number;
  visible: Listing[];
  selected: Listing | null;
  selectedId: string | null;
  onSelectedIdChange: Dispatch<SetStateAction<string | null>>;
  // The details sheet is open for the selected home.
  detailsOpen: boolean;
  onDetailsOpenChange: (open: boolean) => void;
  view: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
  satellite: boolean;
  onSatelliteChange: (satellite: boolean) => void;
  pending: string[];
  canSave: (listingId: string) => boolean;
  notes: ListingNotesController;
  onFavorite: (listingId: string) => Promise<void>;
}

export function ListingsPanel({
  tab,
  snapshot,
  userId,
  mapStyleUrl,
  person,
  onPersonChange,
  section,
  onSectionChange,
  filters,
  hiddenIds,
  hiddenCount,
  onHide,
  onUnhide,
  onFiltersChange,
  filterHosts,
  total,
  visible,
  selected,
  selectedId,
  onSelectedIdChange,
  detailsOpen,
  onDetailsOpenChange,
  view,
  onViewChange,
  satellite,
  onSatelliteChange,
  pending,
  canSave,
  notes,
  onFavorite,
}: ListingsPanelProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersActive = activeFilterCount(filters);
  const points = useMemo(
    () => mapPoints(visible, hiddenIds),
    [visible, hiddenIds],
  );
  // One handler per action, shared by every card, so unchanged cards skip rendering.
  // The favorite handler is rebuilt on every render, so the latest one is read through a ref.
  const favorite = useRef(onFavorite);
  favorite.current = onFavorite;
  const selectListing = useCallback(
    (listingId: string) => {
      onSelectedIdChange(listingId);
      onDetailsOpenChange(true);
    },
    [onSelectedIdChange, onDetailsOpenChange],
  );
  const showOnMap = useCallback(
    (listingId: string) => {
      onSelectedIdChange(listingId);
      onViewChange('map');
    },
    [onSelectedIdChange, onViewChange],
  );
  const hiddenRef = useRef(hiddenIds);
  hiddenRef.current = hiddenIds;
  const toggleHidden = useCallback(
    (listingId: string) =>
      hiddenRef.current.has(listingId)
        ? onUnhide(listingId)
        : onHide(listingId),
    [onHide, onUnhide],
  );
  const favoriteListing = useCallback(
    (listingId: string) => void favorite.current(listingId),
    [],
  );
  const selectedFavorite = {
    mine: selected
      ? snapshot.favorites.some(
          (entry) => entry.listingId === selected.id && entry.userId === userId,
        )
      : false,
    canSave: selected ? canSave(selected.id) : false,
    busy: selected ? pending.includes(selected.id) : false,
  };
  const notLocated = visible.filter(
    (listing) => !hasPin(listing.coordinates),
  ).length;
  return (
    <>
      <Title order={2} className={styles.visuallyHidden}>
        {tab === 'favorites' ? 'Favorites' : 'Listings'}
      </Title>
      <div className={styles.toolbar}>
        <Flex
          gap="sm"
          align="flex-end"
          wrap="wrap"
          className={styles.toolbarControls}
        >
          {tab === 'favorites' ? (
            <Select
              label="Saved by"
              w={{ base: 140, sm: 200 }}
              value={person}
              onChange={(value) => onPersonChange(value ?? 'everyone')}
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
                w={{ base: 140, sm: 200 }}
                value={section}
                onChange={(value) => onSectionChange(value ?? 'all')}
                data={[
                  { value: 'all', label: 'All' },
                  ...MATCH_CHOICES.map(({ value, label }) => ({
                    value,
                    label,
                  })),
                ]}
                comboboxProps={{ withinPortal: false }}
              />
              <Tooltip
                multiline
                w={300}
                events={{ hover: true, focus: true, touch: true }}
                label={
                  <Stack gap={4}>
                    {MATCH_CHOICES.map(({ value, label, description }) => (
                      <Text key={value} size="xs">
                        {label}: {description}
                      </Text>
                    ))}
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
          <Group gap="xs">
            <Button
              variant="default"
              aria-expanded={filtersOpen}
              aria-controls="listing-filters"
              onClick={() => setFiltersOpen((current) => !current)}
            >
              Filters
            </Button>
            {filtersActive > 0 && (
              <Badge
                variant="light"
                color="gray"
                aria-label={`${filtersActive} active filters`}
              >
                {filtersActive} active
              </Badge>
            )}
          </Group>
        </Flex>
        <div className={styles.toolbarFilters} data-open={filtersOpen}>
          <ListingFilterPanel
            open={filtersOpen}
            filters={filters}
            onChange={onFiltersChange}
            hosts={filterHosts}
            shown={visible.length}
            total={total}
          />
        </div>
        <Group
          gap="sm"
          justify="space-between"
          wrap="wrap"
          className={styles.toolbarView}
        >
          <Text size="sm" c="dimmed">
            {visible.length} homes
            {notLocated > 0 && ` · ${notLocated} not located`}
            {hiddenCount > 0 && ` · ${hiddenCount} hidden`}
          </Text>
          <Group gap="xs" role="group" aria-label="View">
            <Button
              variant={view === 'list' ? 'filled' : 'default'}
              aria-pressed={view === 'list'}
              onClick={() => onViewChange('list')}
            >
              List
            </Button>
            <Button
              variant={view === 'map' ? 'filled' : 'default'}
              aria-pressed={view === 'map'}
              onClick={() => onViewChange('map')}
            >
              Map
            </Button>
          </Group>
        </Group>
      </div>
      {!visible.length && (
        <Text>
          No homes here.
          {activeFilterCount(filters) > 0 && ' Clear the filters to see more.'}
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
              busy={pending.includes(listing.id)}
              canSave={canSave(listing.id)}
              hidden={hiddenIds.has(listing.id)}
              onToggleHidden={toggleHidden}
              onSelect={selectListing}
              onSeeOnMap={showOnMap}
              onFavorite={favoriteListing}
            />
          ))}
        </div>
      ) : (
        <div className={styles.mapPanel}>
          {/* The same view the Hidden homes filter sets, so the list and the map stay in step. */}
          <Switch
            label="Show hidden homes"
            checked={filters.hidden !== 'not-hidden'}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                hidden: event.currentTarget.checked ? 'both' : 'not-hidden',
              })
            }
          />
          {visible.length ? (
            <MapLoadBoundary>
              <Suspense fallback={<Text role="status">Loading map…</Text>}>
                <LazyMap
                  styleUrl={mapStyleUrl}
                  satellite={satellite}
                  points={points}
                  controls={
                    <Group gap="xs" role="group" aria-label="Basemap">
                      <Button
                        size="xs"
                        variant={satellite ? 'default' : 'filled'}
                        aria-pressed={!satellite}
                        onClick={() => onSatelliteChange(false)}
                      >
                        Street map
                      </Button>
                      <Button
                        size="xs"
                        variant={satellite ? 'filled' : 'default'}
                        aria-pressed={satellite}
                        onClick={() => onSatelliteChange(true)}
                      >
                        Satellite
                      </Button>
                    </Group>
                  }
                  selectedId={selected?.id ?? null}
                  onSelect={onSelectedIdChange}
                  onDeselect={() => onSelectedIdChange(null)}
                  overlay={
                    selected ? (
                      <PinCard
                        listing={selected}
                        favorite={selectedFavorite}
                        hidden={hiddenIds.has(selected.id)}
                        onFavorite={favoriteListing}
                        onToggleHidden={(listingId) => {
                          toggleHidden(listingId);
                          // A home hidden out of the view takes its card with it, and stays closed when it returns.
                          if (
                            !hiddenIds.has(listingId) &&
                            filters.hidden === 'not-hidden'
                          )
                            onSelectedIdChange(null);
                        }}
                        onClose={() => onSelectedIdChange(null)}
                        onDetails={() => onDetailsOpenChange(true)}
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
      <ListingDrawer
        listing={selected}
        snapshot={snapshot}
        userId={userId}
        opened={detailsOpen && selected !== null}
        stale={selected ? isListingStale(selected, snapshot.edition) : false}
        hidden={selected ? hiddenIds.has(selected.id) : false}
        favorite={selectedFavorite}
        notes={notes}
        onToggleHidden={toggleHidden}
        onFavorite={favoriteListing}
        onClose={() => onDetailsOpenChange(false)}
        onSeeOnMap={() => {
          onDetailsOpenChange(false);
          onViewChange('map');
        }}
      />
    </>
  );
}
