import {
  type Observation,
  observationSchema,
} from '@/features/house-scanner/types/contracts';

// Field meanings below come from one structure-only inspection of a public
// search page on 13 October 2026. Items marked "inferred" were not proven.

export const MAX_HTML_CHARS = 3_000_000;
export const MAX_ITEMS_PER_PAGE = 100;

export interface BoneoReadContext {
  /** Canonical origin; item links must resolve to exactly this origin. */
  origin: string;
  /** Fetch time. Becomes observedAt on every observation. */
  observedAt: Date;
  /** Items already received from earlier pages of the same partition. */
  receivedBefore: number;
}

export type MorePages =
  | { kind: 'none' }
  | { kind: 'more'; remaining: number }
  | { kind: 'unknown'; reason: 'no-total' | 'empty-page-before-total' };

export type PageFailure =
  | 'no-embedded-data'
  | 'invalid-embedded-data'
  | 'unexpected-shape'
  | 'inconsistent-count'
  | 'too-large';

export type BoneoPageRead =
  | {
      kind: 'page';
      observations: Observation[];
      itemCount: number;
      skipped: number;
      /** listData.count. Page two of a five-result search kept count 5 with no items, so it is the total. */
      total: number | null;
      more: MorePages;
    }
  | { kind: 'failed'; reason: PageFailure };

type Facts = Observation['facts'];
type FactKey = keyof Facts;
type Rec = Record<string, unknown>;

const isRecord = (value: unknown): value is Rec =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function numberOf(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && /^-?\d+([.,]\d+)?$/.test(value.trim()))
    return Number(value.trim().replace(',', '.'));
  return null;
}

function isoOf(value: unknown): string | null {
  const raw = text(value);
  if (raw === null || raw.length > 40) return null;
  const time = Date.parse(raw);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function positiveInt(value: unknown, max: number): number | null {
  const number = numberOf(value);
  return number !== null && Number.isInteger(number) && number > 0
    ? number <= max
      ? number
      : null
    : null;
}

function area(value: unknown, max = 10_000): number | null {
  const number = numberOf(value);
  return number !== null && number > 0 && number <= max ? number : null;
}

export function extractNextData(html: string): unknown {
  const match =
    /<script\b[^>]*\bid="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!match) return undefined;
  try {
    // Plain JSON.parse keeps keys that differ only by letter case distinct.
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

const STATUS: Record<string, Facts['status']> = {
  'till salu': 'available',
  kommande: 'upcoming',
  'kommande-light': 'upcoming',
  såld: 'sold',
  'removed from api': 'withdrawn',
};
const TENURE: Record<string, Facts['tenure']> = {
  bostadsrätt: 'cooperative',
  äganderätt: 'ownership',
  hyresrätt: 'rental',
};
const PROPERTY_TYPE: Record<string, Facts['propertyType']> = {
  lägenhet: 'apartment',
  villa: 'house',
  radhus: 'house',
};

function listingUrl(slug: unknown, origin: string): string | null {
  const raw = text(slug);
  if (raw === null || raw.length > 2048) return null;
  try {
    const url = new URL(raw, `${origin}/`);
    if (url.origin !== origin || url.pathname === '/') return null;
    // Drop query and fragment so tracking parameters never persist.
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

function coordinates(item: Rec, observedAt: string) {
  const value = item.field_coordinates;
  if (!isRecord(value)) return null;
  const longitude = numberOf(value.lon);
  const latitude = numberOf(value.lat);
  if (
    longitude === null ||
    latitude === null ||
    Math.abs(longitude) > 180 ||
    Math.abs(latitude) > 90 ||
    (longitude === 0 && latitude === 0)
  )
    return null;
  // The data does not say how exact the point is, so claim the weakest level.
  return {
    longitude,
    latitude,
    precision: 'approximate_area' as const,
    source: 'boneo-search-data',
    observedAt,
  };
}

function observationFromItem(
  item: Rec,
  origin: string,
  observedAt: string,
): Observation | null {
  const propertyId = positiveInt(item.property_id, Number.MAX_SAFE_INTEGER);
  const sourceUrl = listingUrl(item.slug, origin);
  const title = text(item.title_field) ?? text(item.propertyAddress);
  const createdAt = isoOf(item.created_date);
  const publishedAt = isoOf(item.field_property_publish_date);
  const episodeStart = createdAt ?? publishedAt;
  // Identity or link missing: skip rather than guess.
  if (propertyId === null || sourceUrl === null || title === null) return null;
  if (episodeStart === null) return null;

  const conflicts: FactKey[] = [];

  const statusLabel = text(item.field_status_id)?.toLowerCase() ?? null;
  let status: Facts['status'] =
    (statusLabel !== null ? STATUS[statusLabel] : undefined) ?? 'unknown';
  if (
    item.is_active === false &&
    (status === 'available' || status === 'upcoming')
  ) {
    // A live status on a non-active item disagrees with itself.
    status = 'unknown';
    conflicts.push('status');
  }

  const typeLabel = text(item.field_property_original_type)?.toLowerCase();
  const classLabel = text(item.propertyTypesClassName)?.toLowerCase();
  let propertyType: Facts['propertyType'] =
    (typeLabel !== undefined ? PROPERTY_TYPE[typeLabel] : undefined) ?? null;
  const classType =
    (classLabel !== undefined ? PROPERTY_TYPE[classLabel] : undefined) ?? null;
  if (
    propertyType !== null &&
    classType !== null &&
    propertyType !== classType
  ) {
    propertyType = null;
    conflicts.push('propertyType');
  }

  const sellingLabel = text(item.field_property_selling_type)?.toLowerCase();
  const typeList = Array.isArray(item.field_property_type)
    ? text(item.field_property_type[0])?.toLowerCase()
    : undefined;
  let tenure: Facts['tenure'] =
    (sellingLabel !== undefined ? TENURE[sellingLabel] : undefined) ??
    (typeList !== undefined ? TENURE[typeList] : undefined) ??
    'unknown';
  const listTenure = typeList !== undefined ? TENURE[typeList] : undefined;
  const sellingTenure =
    sellingLabel !== undefined ? TENURE[sellingLabel] : undefined;
  if (
    listTenure !== undefined &&
    sellingTenure !== undefined &&
    listTenure !== sellingTenure
  ) {
    tenure = 'unknown';
    conflicts.push('tenure');
  }
  const purchase =
    tenure === 'cooperative' || tenure === 'ownership'
      ? true
      : tenure === 'rental'
        ? false
        : null;

  // An absent or non-positive price is unknown, never zero.
  let askingPriceSek = positiveInt(item.field_property_price, 1_000_000_000);
  const converted = positiveInt(item.field_property_converted_price, 1e9);
  const currency = text(item.field_property_other_currency);
  if (
    askingPriceSek !== null &&
    currency !== null &&
    currency.toUpperCase() !== 'SEK'
  ) {
    askingPriceSek = null;
    conflicts.push('askingPriceSek');
  } else if (
    askingPriceSek !== null &&
    converted !== null &&
    converted !== askingPriceSek
  ) {
    askingPriceSek = null;
    conflicts.push('askingPriceSek');
  }

  const baseFee = positiveInt(item.field_monthly_fee, 1_000_000_000);

  const facts: Facts = {
    propertyType,
    tenure,
    purchase,
    livingAreaM2: area(item.field_property_floor_area),
    // biarea is 0 or null when absent; zero is not a measured value here.
    secondaryAreaM2: area(item.field_property_biarea),
    rooms: area(item.field_property_rooms, 100),
    askingPriceSek,
    groundFloor: null,
    lift: null,
    liftServesHome: null,
    stepFree: null,
    outdoor: null,
    glazed: null,
    largePrivateTerrace: null,
    municipality: text(item.field_property_province)?.slice(0, 100) ?? null,
    baseFeeSek: baseFee,
    mandatoryMonthlySek: null,
    status,
  };

  const parsed = observationSchema.safeParse({
    sourceListingId: String(propertyId),
    episodeId: `created:${episodeStart}`,
    sourceUrl,
    title: title.slice(0, 200),
    observedAt,
    publishedAt,
    facts,
    conflicts,
    coordinates: coordinates(item, observedAt),
    evidence: [],
    photo: null,
  });
  return parsed.success ? parsed.data : null;
}

export function parseBoneoNextData(
  data: unknown,
  context: BoneoReadContext,
): BoneoPageRead {
  if (!isRecord(data))
    return { kind: 'failed', reason: 'invalid-embedded-data' };
  const props = isRecord(data.props) ? data.props : null;
  const pageProps = props && isRecord(props.pageProps) ? props.pageProps : null;
  const listData =
    pageProps && isRecord(pageProps.listData) ? pageProps.listData : null;
  if (listData === null || !Array.isArray(listData.pData))
    return { kind: 'failed', reason: 'unexpected-shape' };
  const items = listData.pData;
  if (items.length > MAX_ITEMS_PER_PAGE)
    return { kind: 'failed', reason: 'too-large' };
  const total = positiveOrZero(listData.count);
  if (total !== null && total < items.length)
    return { kind: 'failed', reason: 'inconsistent-count' };

  const observedAt = context.observedAt.toISOString();
  const observations: Observation[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const item of items) {
    const observation = isRecord(item)
      ? observationFromItem(item, context.origin, observedAt)
      : null;
    const key = observation
      ? `${observation.sourceListingId}\u0000${observation.episodeId}`
      : null;
    if (observation === null || key === null || seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    observations.push(observation);
  }

  const received = context.receivedBefore + items.length;
  let more: MorePages;
  if (total === null) more = { kind: 'unknown', reason: 'no-total' };
  else if (received >= total) more = { kind: 'none' };
  else if (items.length === 0)
    more = { kind: 'unknown', reason: 'empty-page-before-total' };
  else more = { kind: 'more', remaining: total - received };

  return {
    kind: 'page',
    observations,
    itemCount: items.length,
    skipped,
    total,
    more,
  };
}

function positiveOrZero(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

/** Page-level reader: HTML in, observations and a more-pages signal out. */
export function readBoneoSearchPage(
  html: string,
  context: BoneoReadContext,
): BoneoPageRead {
  if (html.length > MAX_HTML_CHARS)
    return { kind: 'failed', reason: 'too-large' };
  const data = extractNextData(html);
  if (data === undefined) return { kind: 'failed', reason: 'no-embedded-data' };
  return parseBoneoNextData(data, context);
}
