import {
  ActionIcon,
  Badge,
  Button,
  Flex,
  Group,
  Select,
  Stack,
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
  useMemo,
  useState,
} from 'react';

import styles from '@/features/house-scanner/components/household-workspace.module.css';
import { ListingCard } from '@/features/house-scanner/components/listing-card';
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
  onFiltersChange: (filters: ListingFilters) => void;
  filterHosts: string[];
  // How many homes the tab holds before the filters apply.
  total: number;
  visible: Listing[];
  selected: Listing | null;
  selectedId: string | null;
  onSelectedIdChange: Dispatch<SetStateAction<string | null>>;
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
  onFiltersChange,
  filterHosts,
  total,
  visible,
  selected,
  selectedId,
  onSelectedIdChange,
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
  const points = useMemo(() => mapPoints(visible), [visible]);
  const notLocated = visible.filter(
    (listing) => !hasPin(listing.coordinates),
  ).length;
  return (
    <>
      <Title order={2} className={styles.visuallyHidden}>
        {tab === 'favorites' ? 'Favorites' : 'Listings'}
      </Title>
      <Flex gap="sm" align="flex-end" wrap="wrap">
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
        {/* Grows to take the free space, which pushes the count and the view toggle to the right. */}
        <Group gap="sm" justify="flex-end" flex="1 1 auto">
          <Text size="sm" c="dimmed">
            {visible.length} homes
            {notLocated > 0 && ` · ${notLocated} not located`}
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
      </Flex>
      <ListingFilterPanel
        open={filtersOpen}
        filters={filters}
        onChange={onFiltersChange}
        hosts={filterHosts}
        shown={visible.length}
        total={total}
      />
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
              details={selectedId === listing.id}
              busy={pending.includes(listing.id)}
              canSave={canSave(listing.id)}
              notes={selectedId === listing.id ? notes : undefined}
              onSelect={() =>
                onSelectedIdChange((current) =>
                  current === listing.id ? null : listing.id,
                )
              }
              onSeeOnMap={() => {
                onSelectedIdChange(listing.id);
                onViewChange('map');
              }}
              onFavorite={() => void onFavorite(listing.id)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.mapPanel}>
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
                  overlay={
                    selected ? (
                      <PinCard
                        listing={selected}
                        onClose={() => onSelectedIdChange(null)}
                        onDetails={() => onViewChange('list')}
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
  );
}
