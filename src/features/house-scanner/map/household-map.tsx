import { Button, Group, Stack, Text } from '@mantine/core';
import { Map as MapLibreMap, Marker, NavigationControl } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

import styles from '@/features/house-scanner/map/household-map.module.css';
import type { Listing } from '@/features/house-scanner/types/contracts';

export interface MapPoint {
  id: string;
  label: string;
  markerText: string;
  coordinates: NonNullable<Listing['coordinates']>;
}
interface HouseholdMapProps {
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  styleUrl?: string;
}

export function HouseholdMap({
  points,
  selectedId,
  onSelect,
  styleUrl = 'https://tiles.openfreemap.org/styles/liberty',
}: HouseholdMapProps) {
  const container = useRef<HTMLElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [stack, setStack] = useState<string[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const first = useRef(points[0]?.coordinates).current;
  const centerLongitude = first?.longitude ?? 0;
  const centerLatitude = first?.latitude ?? 0;
  useEffect(() => {
    if (!container.current || error) return;
    let instance: MapLibreMap | null = null;
    try {
      instance = new MapLibreMap({
        container: container.current,
        style: styleUrl,
        center: [centerLongitude, centerLatitude],
        zoom: 11,
        attributionControl: { compact: false },
      });
      map.current = instance;
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
  }, [styleUrl, centerLongitude, centerLatitude, error]);
  useEffect(() => {
    if (!map.current || !loaded || error) return;
    const instance = map.current;
    const groups = new Map<string, MapPoint[]>();
    for (const point of points) {
      const key = `${point.coordinates.longitude},${point.coordinates.latitude}`;
      groups.set(key, [...(groups.get(key) ?? []), point]);
    }
    const markers = [...groups.values()].map((group) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = styles.marker;
      button.textContent =
        group.length === 1 ? group[0].markerText : String(group.length);
      button.setAttribute(
        'aria-label',
        group.length === 1
          ? group[0].label
          : `${group.length} homes at this point`,
      );
      button.setAttribute(
        'aria-pressed',
        String(group.some((point) => point.id === selectedId)),
      );
      button.addEventListener('click', () => {
        setStack(group.map((point) => point.id));
        onSelectRef.current(group[0].id);
      });
      return new Marker({ element: button })
        .setLngLat([
          group[0].coordinates.longitude,
          group[0].coordinates.latitude,
        ])
        .addTo(instance);
    });
    return () => {
      for (const marker of markers) marker.remove();
    };
  }, [points, selectedId, loaded, error]);
  useEffect(() => {
    const point = points.find((candidate) => candidate.id === selectedId);
    if (point && loaded && !error)
      map.current?.jumpTo({
        center: [point.coordinates.longitude, point.coordinates.latitude],
      });
  }, [points, selectedId, loaded, error]);
  const availableStack = stack.filter((id) =>
    points.some((point) => point.id === id),
  );
  return (
    <Stack gap="sm">
      <Text size="sm">
        OpenFreeMap base tiles. Pins locate a building or supplied position, not
        a particular apartment. Map shading does not verify nature access.
      </Text>
      {error ? (
        <Text role="alert">{error}</Text>
      ) : (
        <>
          {!loaded && <Text role="status">Loading map…</Text>}
          <section
            ref={container}
            className={styles.map}
            aria-label="Listing map"
          />
        </>
      )}
      <Text size="sm">
        {points.length} homes with usable positions. Overlapping homes share a
        numbered point.
      </Text>
      {availableStack.length > 1 && (
        <Group aria-label="Homes at selected point">
          {availableStack.map((id, index) => (
            <Button
              key={id}
              variant={id === selectedId ? 'filled' : 'default'}
              onClick={() => onSelect(id)}
            >
              Home {index + 1}
            </Button>
          ))}
        </Group>
      )}
      <Text size="xs">
        Tiles reveal your network address and viewed region to the tile
        provider. Household notes, favorites and credentials are not sent.
      </Text>
    </Stack>
  );
}
