import {
  readBjurforsDetailPage,
  readBjurforsSearchPage,
} from '@house-scanner-tools/bjurfors-parser';
import {
  readBoneoDetailPage,
  readBoneoSearchPage,
} from '@house-scanner-tools/boneo-parser';
import {
  type LivePartitionInput,
  type SourceAdapter,
  USER_AGENT,
} from '@house-scanner-tools/live-reader';
import {
  BJURFORS_ORIGIN,
  BJURFORS_SOURCE_ID,
  BONEO_IMAGE_ORIGIN,
  BONEO_ORIGIN,
  BONEO_SOURCE_ID,
  type SourceCapability,
} from '@house-scanner-tools/source-registry';

// Path segments proven from one public Goteborg district URL. The municipality
// level path is derived by dropping the district segment and is unproven. A
// wrong guess surfaces as a page without embedded data, which fails coverage.
const APARTMENT_SEGMENT = 'lägenhet';
const MUNICIPALITY_PATHS: Record<string, readonly [string, string]> = {
  göteborg: ['västra götalands', 'göteborg'],
};

export function partitionUrl(municipality: string): string | null {
  const parts = MUNICIPALITY_PATHS[municipality.trim().toLowerCase()];
  if (!parts) return null;
  return `${BONEO_ORIGIN}/sv/till_salu/${[APARTMENT_SEGMENT, ...parts]
    .map(encodeURIComponent)
    .join('/')}`;
}

export const boneoAdapter: SourceAdapter = {
  sourceId: BONEO_SOURCE_ID,
  executor: 'boneo-personal-read',
  origin: BONEO_ORIGIN,
  imageOrigin: BONEO_IMAGE_ORIGIN,
  headers: { 'user-agent': USER_AGENT, accept: 'text/html,text/plain' },
  coordinateSource: 'boneo-search-data',
  detailLabel: 'Balcony and glazing',
  notCovered:
    'Not covered: upcoming and unknown-price listings, houses, other cities.',
  partitionUrl(partition: LivePartitionInput) {
    const base = partitionUrl(partition.municipality);
    if (base === null) return { unsupported: 'municipality-path-unproven' };
    if (!partition.propertyTypes.includes('apartment'))
      return { unsupported: 'only-apartment-path-known' };
    return base;
  },
  readSearchPage: readBoneoSearchPage,
  readDetailPage(html) {
    const read = readBoneoDetailPage(html);
    if (read.kind === 'failed') return read;
    const { kind: _kind, ...facts } = read;
    return { kind: 'detail', facts };
  },
};

// The county and municipality path of the search page, proven for Goteborg only.
const BJURFORS_PATHS: Record<string, string> = {
  göteborg: 'vastra-gotaland/goteborg',
};

export const bjurforsAdapter: SourceAdapter = {
  sourceId: BJURFORS_SOURCE_ID,
  executor: 'bjurfors-personal-read',
  origin: BJURFORS_ORIGIN,
  imageOrigin: BJURFORS_ORIGIN,
  // Without ordinary Accept headers the site answers 200 with an empty body.
  headers: {
    'user-agent': USER_AGENT,
    accept: 'text/html,application/xhtml+xml',
    'accept-language': 'sv-SE,sv;q=0.9,en;q=0.8',
  },
  coordinateSource: 'bjurfors-listing-page',
  detailLabel: 'Listing pages',
  notCovered: 'Not covered: other cities.',
  partitionUrl(partition: LivePartitionInput) {
    const path = BJURFORS_PATHS[partition.municipality.trim().toLowerCase()];
    // The one search lists apartments and houses; the profile filter sorts them later.
    return path === undefined
      ? { unsupported: 'municipality-path-unproven' }
      : `${BJURFORS_ORIGIN}/sv/tillsalu/${path}`;
  },
  readSearchPage: readBjurforsSearchPage,
  readDetailPage: readBjurforsDetailPage,
};

/** The adapter for a capability, only when its policy names exactly this adapter's source and hosts. */
export function adapterFor(capability: SourceCapability): SourceAdapter {
  const { policy } = capability;
  const adapter = [boneoAdapter, bjurforsAdapter].find(
    (candidate) => candidate.executor === capability.executor,
  );
  if (
    adapter === undefined ||
    policy.sourceId !== adapter.sourceId ||
    policy.listingOrigins.length !== 1 ||
    policy.listingOrigins[0] !== adapter.origin ||
    // Photos are allowed from the one image host only, shown by the browser and never fetched here.
    policy.imageOrigins.length !== 1 ||
    policy.imageOrigins[0] !== adapter.imageOrigin
  )
    throw new Error('No permitted executor for this source.');
  return adapter;
}
