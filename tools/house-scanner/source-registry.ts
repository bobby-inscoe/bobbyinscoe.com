import { z } from 'zod';
import {
  factsSchema,
  type SourcePolicy,
  sourcePolicySchema,
} from '@/features/projects/features/house-scanner/types/contracts';
import { assertSourceAllowed } from '@/features/projects/features/house-scanner/utils/source-policy';

export const DEMO_SOURCE_ID = 'synthetic-demo';
export const capabilitySchema = z.strictObject({
  policy: sourcePolicySchema,
  executor: z.enum(['demo-only', 'none']),
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
  ['boneo', 'https://www.boneo.se', 'pending'],
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
