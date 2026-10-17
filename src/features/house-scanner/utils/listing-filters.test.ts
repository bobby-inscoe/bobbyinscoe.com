import { describe, expect, it } from 'vitest';
import { SYNTHETIC_SNAPSHOT } from '@/features/house-scanner/mock/synthetic-household';
import type { Listing } from '@/features/house-scanner/types/contracts';
import {
  activeFilterCount,
  applyListingFilters,
  emptyFilters,
  type ListingFilters,
  MANUAL_HOST,
} from '@/features/house-scanner/utils/listing-filters';

const original = SYNTHETIC_SNAPSHOT.listings[0];
function home(
  facts: Partial<Listing['facts']> = {},
  changes: Partial<Listing> = {},
): Listing {
  return { ...original, ...changes, facts: { ...original.facts, ...facts } };
}
function passes(listing: Listing, filters: Partial<ListingFilters>) {
  return (
    applyListingFilters([listing], { ...emptyFilters, ...filters }).length === 1
  );
}

describe('not on the map filter', () => {
  const at = (precision: 'address' | 'approximate_area') => ({
    longitude: 11.9,
    latitude: 57.7,
    precision,
    source: 'test',
    observedAt: original.observedAt,
  });
  it('keeps only homes without a pin and counts as active', () => {
    expect(
      passes(home({}, { coordinates: at('address') }), { notOnMapOnly: true }),
    ).toBe(false);
    expect(
      passes(home({}, { coordinates: null }), { notOnMapOnly: true }),
    ).toBe(true);
    expect(
      passes(home({}, { coordinates: at('approximate_area') }), {
        notOnMapOnly: true,
      }),
    ).toBe(true);
    expect(activeFilterCount({ ...emptyFilters, notOnMapOnly: true })).toBe(1);
  });
});

describe('applyListingFilters', () => {
  it('keeps everything when no filter is set', () => {
    const all = SYNTHETIC_SNAPSHOT.listings;
    expect(applyListingFilters(all, emptyFilters)).toEqual(all);
  });

  // The base home asks 2 800 000 SEK, has 80 m2 and 3 rooms.
  it.each([
    ['min price below', { minPriceSek: 2_700_000 }, true],
    ['min price at the boundary', { minPriceSek: 2_800_000 }, true],
    ['min price above', { minPriceSek: 2_900_000 }, false],
    ['max price at the boundary', { maxPriceSek: 2_800_000 }, true],
    ['max price below', { maxPriceSek: 2_700_000 }, false],
    ['min area at the boundary', { minAreaM2: 80 }, true],
    ['min area above', { minAreaM2: 81 }, false],
    ['max area at the boundary', { maxAreaM2: 80 }, true],
    ['max area below', { maxAreaM2: 79 }, false],
    ['min rooms at the boundary', { minRooms: 3 }, true],
    ['min rooms above', { minRooms: 3.5 }, false],
    [
      'min above max',
      { minPriceSek: 3_000_000, maxPriceSek: 2_000_000 },
      false,
    ],
    ['NaN ignored', { minPriceSek: Number.NaN, minAreaM2: Number.NaN }, true],
    ['Infinity ignored', { maxAreaM2: Number.POSITIVE_INFINITY }, true],
    ['negative treated as unset', { minPriceSek: -5, maxAreaM2: -1 }, true],
  ] satisfies [string, Partial<ListingFilters>, boolean][])(
    '%s',
    (_name, filters, expected) => {
      expect(passes(home(), filters)).toBe(expected);
    },
  );

  it.each([
    ['price', { askingPriceSek: null }, { minPriceSek: 1_000_000 }],
    ['area', { livingAreaM2: null }, { minAreaM2: 50 }],
    ['rooms', { rooms: null }, { minRooms: 2 }],
  ] satisfies [string, Partial<Listing['facts']>, Partial<ListingFilters>][])(
    'unknown %s follows includeUnknown',
    (_name, facts, filters) => {
      expect(passes(home(facts), { ...filters, includeUnknown: true })).toBe(
        true,
      );
      expect(passes(home(facts), { ...filters, includeUnknown: false })).toBe(
        false,
      );
    },
  );

  it('treats a disputed price as unknown, even when it would match', () => {
    const disputed = home({}, { conflicts: ['askingPriceSek'] });
    const filters = { minPriceSek: 2_000_000, maxPriceSek: 3_000_000 };
    expect(passes(disputed, { ...filters, includeUnknown: true })).toBe(true);
    expect(passes(disputed, { ...filters, includeUnknown: false })).toBe(false);
  });

  it('does not hide unknown values when their filter is not active', () => {
    expect(
      passes(home({ askingPriceSek: null }), {
        minAreaM2: 50,
        includeUnknown: false,
      }),
    ).toBe(true);
  });

  it.each([
    ['balcony', 'balcony', true],
    ['terrace', 'terrace', true],
    ['both', 'both', true],
    ['none', 'none', false],
    ['unknown', null, false],
  ] as const)('outdoor only with %s', (_name, outdoor, expected) => {
    expect(passes(home({ outdoor }), { outdoorOnly: true })).toBe(expected);
    expect(passes(home({ outdoor }), { outdoorOnly: false })).toBe(true);
  });

  it.each([
    ['upper floor', false, true],
    ['ground floor', true, false],
    ['unknown', null, false],
  ] as const)('above ground only with %s', (_name, groundFloor, expected) => {
    expect(passes(home({ groundFloor }), { aboveGroundOnly: true })).toBe(
      expected,
    );
  });

  it('filters by source host, with manual links under the household label', () => {
    const source = home(
      {},
      { origin: 'source', sourceUrls: ['https://www.hemnet.se/bostad/1'] },
    );
    const manual = home(
      {},
      { origin: 'manual', sourceUrls: ['https://example.invalid/x'] },
    );
    expect(passes(source, { host: 'www.hemnet.se' })).toBe(true);
    expect(passes(source, { host: MANUAL_HOST })).toBe(false);
    expect(passes(manual, { host: MANUAL_HOST })).toBe(true);
    expect(passes(manual, { host: 'example.invalid' })).toBe(false);
  });

  it('counts a range as one active filter and ignores invalid values', () => {
    expect(activeFilterCount(emptyFilters)).toBe(0);
    expect(
      activeFilterCount({
        ...emptyFilters,
        minPriceSek: 1_000_000,
        maxPriceSek: 2_000_000,
        minAreaM2: Number.NaN,
        outdoorOnly: true,
        includeUnknown: false,
      }),
    ).toBe(2);
  });
});

describe('lift and glazed filters', () => {
  it.each([
    ['liftOnly', 'lift'],
    ['glazedOnly', 'glazed'],
  ] as const)(
    '%s keeps only homes where %s is known true and not disputed',
    (key, fact) => {
      expect(passes(home({ [fact]: true }), { [key]: true })).toBe(true);
      expect(passes(home({ [fact]: false }), { [key]: true })).toBe(false);
      expect(passes(home({ [fact]: null }), { [key]: true })).toBe(false);
      expect(
        passes(home({ [fact]: true }, { conflicts: [fact] }), { [key]: true }),
      ).toBe(false);
      expect(passes(home({ [fact]: false }), { [key]: false })).toBe(true);
      expect(activeFilterCount({ ...emptyFilters, [key]: true })).toBe(1);
    },
  );
});

describe('hidden homes view', () => {
  const [first, second] = SYNTHETIC_SNAPSHOT.listings;
  const hidden = new Set([second.id]);
  const ids = (view: ListingFilters['hidden']) =>
    applyListingFilters(
      [first, second],
      { ...emptyFilters, hidden: view },
      hidden,
    ).map((listing) => listing.id);
  it('hides hidden homes by default and can show only them or both', () => {
    expect(emptyFilters.hidden).toBe('not-hidden');
    expect(ids('not-hidden')).toEqual([first.id]);
    expect(ids('hidden-only')).toEqual([second.id]);
    expect(ids('both')).toEqual([first.id, second.id]);
  });
  it('counts as an active filter only when it is not the default', () => {
    expect(activeFilterCount(emptyFilters)).toBe(0);
    expect(activeFilterCount({ ...emptyFilters, hidden: 'both' })).toBe(1);
    expect(activeFilterCount({ ...emptyFilters, hidden: 'hidden-only' })).toBe(
      1,
    );
  });
});
