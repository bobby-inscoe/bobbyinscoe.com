import type { Listing } from '@/features/house-scanner/types/contracts';

type Coordinates = Listing['coordinates'];

/** A home gets a pin only when it has a position more precise than an area. */
export function hasPin(
  coordinates: Coordinates,
): coordinates is NonNullable<Coordinates> {
  return coordinates !== null && coordinates.precision !== 'approximate_area';
}
