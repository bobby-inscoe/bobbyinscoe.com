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
export const capabilitySchema = z.strictObject({
  policy: sourcePolicySchema,
  executor: z.enum(['demo-only', 'boneo-personal-read', 'none']),
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
  ['bjurfors', 'https://www.bjurfors.se', 'pending'],
  ['erik-olsson', 'https://www.erikolsson.se', 'pending'],
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
        retentionDays: 14,
        listingOrigins: [BONEO_ORIGIN],
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
            'Floor, lift, outdoor and glazing are not structured fields and stay unknown.',
            'Photos are not read. Image display and hotlinking are off.',
            'Listing identity and episode rules come from property_id and created_date and are unproven across relistings.',
            'Known listings cannot be refreshed outside discovery.',
          ],
        },
      },
      executor: 'boneo-personal-read',
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
