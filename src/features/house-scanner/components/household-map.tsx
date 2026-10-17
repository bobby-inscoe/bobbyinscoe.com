import { Button, Group, Stack, Text } from '@mantine/core';
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type StyleSpecification,
  setWorkerUrl,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

import styles from '@/features/house-scanner/components/household-map.module.css';
import type { MapPoint } from '@/features/house-scanner/utils/listing-view';

// MapLibre resolves its default worker beside import.meta.url, which Vite rewrites.
setWorkerUrl(workerUrl);

const MAX_STACK_BUTTONS = 6;

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    imagery: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'imagery', type: 'raster', source: 'imagery' }],
};

interface MarkerEntry {
  marker: Marker;
  button: HTMLButtonElement;
  // The homes sharing this marker.
  ids: string[];
}

function markPressed(entries: MarkerEntry[], selectedId: string | null) {
  for (const { button, ids } of entries)
    button.setAttribute(
      'aria-pressed',
      String(selectedId !== null && ids.includes(selectedId)),
    );
}

interface HouseholdMapProps {
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  styleUrl?: string;
  satellite?: boolean;
  // Drawn over the map, for the selected home's card.
  overlay?: ReactNode;
}

export function HouseholdMap({
  points,
  selectedId,
  onSelect,
  styleUrl = 'https://tiles.openfreemap.org/styles/liberty',
  satellite = false,
  overlay,
}: HouseholdMapProps) {
  const container = useRef<HTMLElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [stack, setStack] = useState<string[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const markers = useRef<MarkerEntry[]>([]);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const satelliteRef = useRef(satellite);
  satelliteRef.current = satellite;
  const appliedSatellite = useRef(satellite);
  const first = useRef(points[0]?.coordinates).current;
  // The first view frames every home, including the not-located marker.
  const bounds = useRef(
    points.length > 1
      ? ([
          [
            Math.min(...points.map((p) => p.coordinates.longitude)),
            Math.min(...points.map((p) => p.coordinates.latitude)),
          ],
          [
            Math.max(...points.map((p) => p.coordinates.longitude)),
            Math.max(...points.map((p) => p.coordinates.latitude)),
          ],
        ] as [[number, number], [number, number]])
      : undefined,
  ).current;
  const centerLongitude = first?.longitude ?? 0;
  const centerLatitude = first?.latitude ?? 0;
  useEffect(() => {
    if (!container.current || error) return;
    let instance: MapLibreMap | null = null;
    try {
      instance = new MapLibreMap({
        container: container.current,
        style: satelliteRef.current ? SATELLITE_STYLE : styleUrl,
        center: [centerLongitude, centerLatitude],
        zoom: 11,
        bounds,
        fitBoundsOptions: { padding: 40, maxZoom: 14 },
        attributionControl: { compact: false },
      });
      map.current = instance;
      appliedSatellite.current = satelliteRef.current;
      instance.addControl(new NavigationControl());
      instance.on('load', () => setLoaded(true));
      instance.on('error', () =>
        setError(
          'Map tiles are unavailable. The listing controls and details remain usable.',
        ),
      );
    } catch {
      setError(
        'This browser cannot display the map. Use the listing controls instead.',
      );
    }
    return () => {
      instance?.remove();
      map.current = null;
    };
  }, [styleUrl, centerLongitude, centerLatitude, bounds, error]);
  useEffect(() => {
    if (!map.current || appliedSatellite.current === satellite) return;
    appliedSatellite.current = satellite;
    map.current.setStyle(satellite ? SATELLITE_STYLE : styleUrl);
  }, [satellite, styleUrl]);
  useEffect(() => {
    if (!map.current || !loaded || error) return;
    const instance = map.current;
    const groups = new Map<string, MapPoint[]>();
    for (const point of points) {
      const key = `${point.coordinates.longitude},${point.coordinates.latitude}`;
      groups.set(key, [...(groups.get(key) ?? []), point]);
    }
    const created = [...groups.values()].map((group) => {
      const button = document.createElement('button');
      button.type = 'button';
      const unlocated = group[0].unlocated === true;
      button.className = `${styles.marker} ${unlocated ? styles.unlocated : ''}`;
      button.textContent = unlocated
        ? `${group.length} not located`
        : group.length === 1
          ? group[0].markerText
          : String(group.length);
      button.setAttribute(
        'aria-label',
        unlocated
          ? `${group.length} homes with no known position`
          : group.length === 1
            ? group[0].label
            : `${group.length} homes at this point`,
      );
      button.addEventListener('click', () => {
        setStack(group.map((point) => point.id));
        onSelectRef.current(group[0].id);
      });
      const marker = new Marker({ element: button })
        .setLngLat([
          group[0].coordinates.longitude,
          group[0].coordinates.latitude,
        ])
        .addTo(instance);
      return { marker, button, ids: group.map((point) => point.id) };
    });
    markers.current = created;
    markPressed(created, selectedIdRef.current);
    return () => {
      for (const { marker } of created) marker.remove();
      markers.current = [];
    };
  }, [points, loaded, error]);
  // Only the pressed state changes on selection, so a focused marker stays focused.
  useEffect(() => {
    markPressed(markers.current, selectedId);
  }, [selectedId]);
  useEffect(() => {
    const point = points.find((candidate) => candidate.id === selectedId);
    if (point && loaded && !error)
      map.current?.jumpTo({
        center: [point.coordinates.longitude, point.coordinates.latitude],
      });
  }, [points, selectedId, loaded, error]);
  const provider = satellite ? 'Esri' : 'OpenFreeMap';
  const availableStack = stack.filter((id) =>
    points.some((point) => point.id === id),
  );
  const count = availableStack.length;
  const at = Math.max(0, availableStack.indexOf(selectedId ?? ''));
  return (
    <Stack gap="sm">
      {error ? (
        <Text role="alert">{error}</Text>
      ) : (
        <>
          {!loaded && <Text role="status">Loading map…</Text>}
          <div className={styles.stage}>
            <section
              ref={container}
              className={styles.map}
              aria-label="Listing map"
            />
            {overlay}
          </div>
        </>
      )}
      {availableStack.length > 1 && (
        <Group aria-label="Homes at selected point">
          {availableStack.length > MAX_STACK_BUTTONS ? (
            <>
              <Button
                variant="default"
                onClick={() =>
                  onSelect(availableStack[(at - 1 + count) % count])
                }
              >
                Previous
              </Button>
              <Text size="sm">
                Home {at + 1} of {count}
              </Text>
              <Button
                variant="default"
                onClick={() => onSelect(availableStack[(at + 1) % count])}
              >
                Next
              </Button>
            </>
          ) : (
            availableStack.map((id, index) => (
              <Button
                key={id}
                variant={id === selectedId ? 'filled' : 'default'}
                onClick={() => onSelect(id)}
              >
                Home {index + 1}
              </Button>
            ))
          )}
        </Group>
      )}
      <Text size="xs" c="dimmed">
        Map tiles come from {provider}, which sees your address and the area you
        view.
      </Text>
    </Stack>
  );
}
