import { z } from 'zod';
import {
  factsSchema,
  type SourcePolicy,
  sourcePolicySchema,
} from '@/features/house-scanner/types/contracts';
import { assertSourceAllowed } from '@/features/house-scanner/utils/source-policy';

export const DEMO_SOURCE_ID = 'synthetic-demo';
export const BONEO_SOURCE_ID = 'boneo';
export const BONEO_ORIGIN = 'https://www.boneo.se';
export const BONEO_IMAGE_ORIGIN = 'https://files.boneo.se';
export const BJURFORS_SOURCE_ID = 'bjurfors';
export const ERIK_OLSSON_SOURCE_ID = 'erik-olsson';
export const ERIK_OLSSON_ORIGIN = 'https://www.erikolsson.se';
// Photos come from the same host as the listing pages.
export const BJURFORS_ORIGIN = 'https://www.bjurfors.se';
export const capabilitySchema = z.strictObject({
  policy: sourcePolicySchema,
  executor: z.enum([
    'demo-only',
    'boneo-personal-read',
    'bjurfors-personal-read',
    'erik-olsson-personal-read',
    'none',
  ]),
  nativeNumericFiltersVerified: z.boolean(),
  geographicPartitioning: z.enum(['municipality', 'unverified']),
});
export type SourceCapability = z.infer<typeof capabilitySchema>;

const reviewedAt = '2026-10-12T00:00:00Z';
const reviewDueAt = '2027-01-10T00:00:00Z';
const noCapabilities: SourcePolicy['capabilities'] = {
  discovery: false,
  knownListingRefresh: false,
  unknownPrice: false,
  upcoming: false,
  pagination: false,
  resultCap: null,
  coverageGaps: [
    'Collection and reuse permission is absent; no live inventory coverage.',
    'Identity, pagination, unknown prices, upcoming inventory and updates are unverified.',
  ],
};

const candidates = [
  ['stadshem', 'https://stadshem.se', 'pending'],
  ['alvhem', 'https://www.alvhem.com', 'pending'],
  ['fastighetsbyran', 'https://www.fastighetsbyran.com', 'disabled'],
  ['booli', 'https://www.booli.se', 'disabled'],
  ['hemnet', 'https://www.hemnet.se', 'disabled'],
  ['norban', 'https://norban.se', 'disabled'],
] as const;

export function sourceRegistry(): SourceCapability[] {
  const common = {
    revision: 1,
    reviewedAt,
    reviewDueAt,
    imageOrigins: [],
    allowedEvidenceSubjects: [],
    freeOnly: true,
    imageDisplay: false,
    imageHotlink: false,
    modelProcessing: false,
    emailDigest: false,
    telegramDigest: false,
    retentionDays: 30,
  } as const;
  return [
    capabilitySchema.parse({
      policy: {
        ...common,
        sourceId: DEMO_SOURCE_ID,
        status: 'approved',
        listingOrigins: ['https://example.invalid'],
        automatedCollection: true,
        privateDisplay: true,
        rightsBasis:
          'Fictional, authored fixture data only. No live-source permission or coverage.',
        allowedFactFields: factsSchema
          .keyof()
          .options.filter(
            (field) =>
              !['secondaryAreaM2', 'mandatoryMonthlySek'].includes(field),
          ),
        capabilities: {
          discovery: true,
          knownListingRefresh: true,
          unknownPrice: true,
          upcoming: true,
          pagination: true,
          resultCap: 100,
          coverageGaps: [
            'Synthetic fixtures only; no live discovery or refresh.',
          ],
        },
      },
      executor: 'demo-only',
      nativeNumericFiltersVerified: false,
      geographicPartitioning: 'municipality',
    }),
    capabilitySchema.parse({
      policy: {
        ...common,
        sourceId: BONEO_SOURCE_ID,
        // Pending is not approved: the operator sets approval in the database.
        status: 'pending',
        // Revision 2 turned on hotlinked photos from the image host. Revision 3 adds outdoor and glazed. Revision 4 adds groundFloor.
        revision: 4,
        retentionDays: 14,
        listingOrigins: [BONEO_ORIGIN],
        imageOrigins: [BONEO_IMAGE_ORIGIN],
        imageDisplay: true,
        imageHotlink: true,
        automatedCollection: false,
        privateDisplay: false,
        rightsBasis:
          'Permission unresolved. The household owner chose to read public search pages for personal use at their own judgment. Technical access is not a reuse license.',
        allowedFactFields: [
          'propertyType',
          'tenure',
          'purchase',
          'livingAreaM2',
          'secondaryAreaM2',
          'rooms',
          'askingPriceSek',
          'municipality',
          'baseFeeSek',
          'status',
          'outdoor',
          'glazed',
          'groundFloor',
        ],
        capabilities: {
          discovery: true,
          knownListingRefresh: false,
          unknownPrice: false,
          upcoming: false,
          pagination: false,
          resultCap: null,
          coverageGaps: [
            'Permission is unresolved and the source is not approved.',
            'Only the Till salu view was observed. Upcoming (Kommande) inventory appears in facet counts but its query is unproven.',
            'Whether listings without a price appear in the default view is unproven.',
            'The page query is accepted but page size and multi-page ordering are unproven. Coverage is never reported complete.',
            'Only apartment paths for Goteborg are supported. Houses and other municipalities are not covered.',
            'Outdoor, glazing and floor come from each kept listing page; glazing only from description wording. Only floor 2 or higher (or an explicit ground floor) is a fact; floor 1 stays unknown. Lift and build year are not collected.',
            'Only the first photo is shown, hotlinked from the broker image host. Nothing is copied or stored.',
            'Listing identity and episode rules come from property_id and created_date and are unproven across relistings.',
            'Known listings cannot be refreshed outside discovery.',
          ],
        },
      },
      executor: 'boneo-personal-read',
      nativeNumericFiltersVerified: false,
      geographicPartitioning: 'unverified',
    }),
    capabilitySchema.parse({
      policy: {
        ...common,
        sourceId: BJURFORS_SOURCE_ID,
        // Pending is not approved: the operator sets approval in the database.
        status: 'pending',
        retentionDays: 14,
        listingOrigins: [BJURFORS_ORIGIN],
        imageOrigins: [BJURFORS_ORIGIN],
        imageDisplay: true,
        imageHotlink: true,
        automatedCollection: false,
        privateDisplay: false,
        rightsBasis:
          'Permission unresolved. The household owner chose to read public search pages for personal use at their own judgment. Technical access is not a reuse license.',
        allowedFactFields: [
          'propertyType',
          'tenure',
          'purchase',
          'livingAreaM2',
          'secondaryAreaM2',
          'rooms',
          'askingPriceSek',
          'municipality',
          'baseFeeSek',
          'status',
          'outdoor',
          'groundFloor',
          'lift',
        ],
        capabilities: {
          discovery: true,
          knownListingRefresh: false,
          unknownPrice: false,
          upcoming: false,
          pagination: false,
          resultCap: null,
          coverageGaps: [
            'Permission is unresolved and the source is not approved.',
            'Only the Goteborg municipality search is supported. Other municipalities are not covered.',
            'The search page lists its total and page links, so a full read is detected, but only the default Till salu view was observed. Whether upcoming homes or homes without a price are all included is unproven.',
            'Cards give area, rooms and sometimes a price; the property type is only known from the listing page, so houses are dropped after that page is read.',
            'A card that links outside the for-sale listing path, such as a project page, is skipped and not read.',
            'Listing pages are read for kept listings only, up to the per-run cap. Balcony, floor, fee, lift, tenure and coordinates come from the page; glazing is not collected.',
            'Balcony is a fact only when the page says Ja. An absent or unticked box stays unknown. Lift is a fact only when the page says Ja. Only floor 2 or higher (or an explicit ground floor) is a floor fact.',
            'Coordinates come from the listing page and matched an independent geocoder within 12 m on four of four listings. Precision is address for a title with a house number.',
            'Upcoming status is inferred from the PreOrder availability value on one page and is unproven.',
            'Only the first photo is shown, hotlinked from the broker host. It loaded without a referrer. Nothing is copied or stored.',
            'Listing identity is the listing page path and the episode never changes, so a relisting of the same home is not told apart.',
            'Known listings cannot be refreshed outside discovery.',
          ],
        },
      },
      executor: 'bjurfors-personal-read',
      nativeNumericFiltersVerified: false,
      geographicPartitioning: 'unverified',
    }),
    capabilitySchema.parse({
      policy: {
        ...common,
        sourceId: ERIK_OLSSON_SOURCE_ID,
        // Pending is not approved: the operator sets approval in the database.
        status: 'pending',
        retentionDays: 14,
        listingOrigins: [ERIK_OLSSON_ORIGIN],
        // No photos: its terms limit copying and reproducing, and no image host was checked.
        imageOrigins: [],
        imageDisplay: false,
        imageHotlink: false,
        automatedCollection: false,
        privateDisplay: false,
        rightsBasis:
          'Permission unresolved. The household owner chose to read public search pages for personal use at their own judgment. Its terms grant a personal, non-commercial licence and do not mention automated reading. Technical access is not a reuse license.',
        allowedFactFields: [
          'propertyType',
          'tenure',
          'purchase',
          'livingAreaM2',
          'secondaryAreaM2',
          'rooms',
          'askingPriceSek',
          'municipality',
          'baseFeeSek',
          'status',
          'outdoor',
          'groundFloor',
          'lift',
        ],
        capabilities: {
          discovery: true,
          knownListingRefresh: false,
          unknownPrice: false,
          upcoming: false,
          pagination: false,
          resultCap: null,
          coverageGaps: [
            'Permission is unresolved and the source is not approved.',
            'Only the Goteborg municipality search is supported. Other municipalities are not covered.',
            'Pre-market homes (Underhand) show no street and have no page of their own, so they are counted and skipped. They were most of the first result page and a minority of the second.',
            'Result pages hold sixteen cards and carry a total, so a full read is detected, but only the default for-sale search was observed. Whether upcoming homes or homes without an asking price are all included is unproven.',
            'Cards give type, area, rooms, fee and price. Balcony, patio, floor, lift, tenure, status and coordinates come from each kept home page, read up to the per-run cap.',
            'Balcony and patio are facts only when ticked; an unticked box stays unknown. Lift is a fact only when the page says yes. Only floor 2 or higher (or floor 0) is a floor fact. Glazing is not collected.',
            'Coordinates come from the broker and are used only when the address is not hidden. They are labelled address-level when the title has a house number; accuracy was not compared with an independent geocoder.',
            'No photos are shown for this source.',
            'Listing identity is the numeric id at the end of the page path and the episode never changes, so a relisting of the same home is not told apart.',
            'Known listings cannot be refreshed outside discovery.',
          ],
        },
      },
      executor: 'erik-olsson-personal-read',
      nativeNumericFiltersVerified: false,
      geographicPartitioning: 'unverified',
    }),
    ...candidates.map(([sourceId, origin, status]) =>
      capabilitySchema.parse({
        policy: {
          ...common,
          sourceId,
          status,
          listingOrigins: [origin],
          automatedCollection: false,
          privateDisplay: false,
          rightsBasis:
            'Permission unresolved or restricted. Technical access is not a reuse license.',
          allowedFactFields: [],
          capabilities: noCapabilities,
        },
        executor: 'none',
        nativeNumericFiltersVerified: false,
        geographicPartitioning: 'unverified',
      }),
    ),
  ];
}

export function assertDemoExecution(
  capability: SourceCapability,
  at: Date,
): void {
  const validated = capabilitySchema.parse(capability);
  assertSourceAllowed(validated.policy, at);
  if (
    validated.executor !== 'demo-only' ||
    validated.policy.sourceId !== DEMO_SOURCE_ID ||
    validated.policy.listingOrigins.length !== 1 ||
    validated.policy.listingOrigins[0] !== 'https://example.invalid' ||
    validated.policy.imageOrigins.length !== 0
  ) {
    throw new Error(
      'No permitted executor: only the authored synthetic source can execute.',
    );
  }
}

// The registry keeps real sources pending, so approval is an explicit owner step. This builds
// the approved policy the owner writes to the database. Valid for 90 days.
export function approvedPolicy(
  sourceId: string,
  now = new Date(),
): SourcePolicy {
  const entry = sourceRegistry().find(
    (item) => item.policy.sourceId === sourceId,
  );
  if (!entry) throw new Error('Unknown source.');
  const day = 24 * 60 * 60 * 1000;
  return sourcePolicySchema.parse({
    ...entry.policy,
    status: 'approved',
    automatedCollection: true,
    privateDisplay: true,
    capabilities: {
      ...entry.policy.capabilities,
      coverageGaps: entry.policy.capabilities.coverageGaps.filter(
        (gap) => !gap.includes('not approved'),
      ),
    },
    // Five minutes back so database clock skew cannot put the review in the future.
    reviewedAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
    reviewDueAt: new Date(now.getTime() + 90 * day).toISOString(),
  });
}
