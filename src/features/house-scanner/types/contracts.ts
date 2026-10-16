import { z } from 'zod';

export const CONTRACT_VERSION = 1;
const id = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
const money = z.number().int().nonnegative().max(1_000_000_000);
// z.url() can accept strings that the URL constructor then rejects (for example
// some punycode or numeric hosts). A throw inside a refinement escapes safeParse,
// so every URL refinement goes through this guard and fails validation instead.
function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
const originSchema = z
  .url()
  .refine((value) => parseUrl(value)?.origin === value);
export const listingUrlSchema = z
  .url()
  .max(2048)
  .refine((value) => {
    const url = parseUrl(value);
    return (
      url !== null &&
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  }, 'Use an HTTP(S) link without credentials.');

export const criteriaSchema = z
  .strictObject({
    minAreaM2: z.number().positive().max(10000),
    maxAreaM2: z.number().positive().max(10000).nullable(),
    minRooms: z.number().positive().max(100),
    preferredPriceSek: money,
    stretchPriceSek: money,
    propertyTypes: z
      .array(z.enum(['apartment', 'house']))
      .min(1)
      .max(2),
    excludeGroundFloor: z.boolean(),
    requireLift: z.boolean(),
    requireOutdoor: z.boolean(),
    preferGlazing: z.boolean(),
    feeReferenceSek: money,
    geography: z.strictObject({
      municipalities: z.array(z.string().min(1).max(100)).min(1).max(100),
      center: z.tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ]),
      radiusKm: z.number().positive().max(100),
    }),
    nature: z.strictObject({
      preferImmediateGreenery: z.boolean(),
      preferredWalkMinutes: z.number().positive().max(120),
    }),
    transit: z.strictObject({
      preferredWalkMinutes: z.number().positive().max(120),
      preferredJourneyMinutes: z.number().positive().max(240),
      tradeoffJourneyMinutes: z.number().positive().max(240),
    }),
  })
  .refine(
    (c) => c.maxAreaM2 === null || c.maxAreaM2 >= c.minAreaM2,
    'Maximum area must cover minimum area.',
  )
  .refine(
    (c) => c.stretchPriceSek >= c.preferredPriceSek,
    'Stretch price must cover preferred price.',
  )
  .refine(
    (c) =>
      c.transit.tradeoffJourneyMinutes >= c.transit.preferredJourneyMinutes,
    'Trade-off journey must cover preferred journey.',
  );

export const profileSchema = z.strictObject({
  id,
  householdId: id,
  revision: z.number().int().positive(),
  name: z.string().min(1).max(80),
  enabled: z.boolean(),
  criteria: criteriaSchema,
  editedBy: id,
  editedAt: timestamp,
});
export const evidenceSchema = z.strictObject({
  id,
  kind: z.enum([
    'source_claim',
    'buyer_observation',
    'measurement',
    'model_interpretation',
  ]),
  subject: z.enum([
    'facts',
    'nearby_nature',
    'nature_access',
    'green_outlook',
    'privacy',
    'quietness',
    'transit',
  ]),
  summary: z.string().min(1).max(1000),
  sourceUrl: listingUrlSchema.nullable(),
  observedAt: timestamp,
  datasetVersion: z.string().max(120).nullable(),
  method: z.string().max(200).nullable(),
  value: z.number().finite().nullable(),
  unit: z
    .enum(['metres_straight_line', 'minutes_routed', 'decibels'])
    .nullable(),
});
export const coordinateSchema = z.strictObject({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  precision: z.enum([
    'address',
    'building',
    'approximate_area',
    'user_supplied',
  ]),
  source: z.string().min(1).max(120),
  observedAt: timestamp,
});
export const factsSchema = z.strictObject({
  propertyType: z.enum(['apartment', 'house']).nullable(),
  tenure: z.enum(['ownership', 'cooperative', 'rental', 'unknown']),
  purchase: z.boolean().nullable(),
  livingAreaM2: z.number().positive().max(10000).nullable(),
  secondaryAreaM2: z.number().nonnegative().max(10000).nullable(),
  rooms: z.number().positive().max(100).nullable(),
  askingPriceSek: money.positive().nullable(),
  groundFloor: z.boolean().nullable(),
  lift: z.boolean().nullable(),
  liftServesHome: z.boolean().nullable(),
  stepFree: z.boolean().nullable(),
  outdoor: z.enum(['balcony', 'terrace', 'both', 'none']).nullable(),
  glazed: z.boolean().nullable(),
  largePrivateTerrace: z.boolean().nullable(),
  municipality: z.string().max(100).nullable(),
  baseFeeSek: money.nullable(),
  mandatoryMonthlySek: money.nullable(),
  status: z.enum(['upcoming', 'available', 'sold', 'withdrawn', 'unknown']),
});
export const photoSchema = z.strictObject({
  url: listingUrlSchema,
  attribution: z.string().min(1).max(300),
  rightsBasis: z.string().min(1).max(500),
  expiresAt: timestamp,
  observedAt: timestamp,
  displayAllowed: z.literal(true),
  hotlinkAllowed: z.literal(true),
});
export const observationSchema = z.strictObject({
  sourceListingId: z.string().min(1).max(200),
  episodeId: z.string().min(1).max(200),
  sourceUrl: listingUrlSchema,
  title: z.string().min(1).max(200),
  observedAt: timestamp,
  publishedAt: timestamp.nullable(),
  facts: factsSchema,
  conflicts: z.array(factsSchema.keyof()).max(20),
  coordinates: coordinateSchema.nullable(),
  evidence: z.array(evidenceSchema).max(50),
  photo: photoSchema.nullable(),
});
export const sourcePolicySchema = z.strictObject({
  sourceId: z.string().regex(/^[a-z0-9-]{1,60}$/),
  revision: z.number().int().positive(),
  status: z.enum(['disabled', 'pending', 'approved']),
  reviewedAt: timestamp,
  reviewDueAt: timestamp,
  rightsBasis: z.string().min(1).max(2000),
  listingOrigins: z.array(originSchema).min(1).max(20),
  imageOrigins: z.array(originSchema).max(20),
  allowedEvidenceSubjects: z.array(evidenceSchema.shape.subject).max(10),
  freeOnly: z.literal(true),
  automatedCollection: z.boolean(),
  privateDisplay: z.boolean(),
  imageDisplay: z.boolean(),
  imageHotlink: z.boolean(),
  modelProcessing: z.boolean(),
  emailDigest: z.boolean(),
  telegramDigest: z.boolean(),
  allowedFactFields: z.array(factsSchema.keyof()).max(20),
  retentionDays: z.number().int().positive().max(180),
  capabilities: z.strictObject({
    discovery: z.boolean(),
    knownListingRefresh: z.boolean(),
    unknownPrice: z.boolean(),
    upcoming: z.boolean(),
    pagination: z.boolean(),
    resultCap: z.number().int().positive().nullable(),
    coverageGaps: z.array(z.string().max(300)).max(30),
  }),
});
export const memberSchema = z.strictObject({
  householdId: id,
  userId: id,
  displayName: z.string().min(1).max(80),
  role: z.enum(['owner', 'member']),
});
export const favoriteSchema = z.strictObject({
  householdId: id,
  listingId: id,
  userId: id,
  savedAt: timestamp,
});
export const listingSchema = z.strictObject({
  id,
  householdId: id,
  origin: z.enum(['source', 'manual', 'synthetic']),
  title: z.string().min(1).max(200),
  sourceUrls: z.array(listingUrlSchema).min(1).max(20),
  facts: factsSchema,
  conflicts: z.array(factsSchema.keyof()).max(20),
  coordinates: coordinateSchema.nullable(),
  evidence: z.array(evidenceSchema).max(50),
  photo: photoSchema.nullable(),
  previousAskingPriceSek: money.positive().nullable(),
  observedAt: timestamp,
  addedBy: id.nullable(),
  userTags: z.array(z.string().max(40)).max(10),
});
export const snapshotSchema = z.strictObject({
  contractVersion: z.literal(CONTRACT_VERSION),
  householdId: id,
  edition: z
    .strictObject({
      id,
      publishedAt: timestamp,
      coverage: z.enum(['synthetic', 'partial', 'complete']),
      sourceSummary: z.string().max(1000),
    })
    .nullable(),
  members: z.array(memberSchema).max(10),
  profiles: z.array(profileSchema).max(20),
  listings: z.array(listingSchema).max(500),
  favorites: z.array(favoriteSchema).max(5000),
});
export const manualSubmissionSchema = z.strictObject({
  url: listingUrlSchema,
  title: z.string().trim().max(200),
  note: z.string().trim().max(2000),
  tags: z.array(z.string().trim().min(1).max(40)).max(10),
});
export const ingestRequestSchema = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('begin'),
    contractVersion: z.literal(CONTRACT_VERSION),
    runId: id,
    profileVersions: z
      .array(
        z.strictObject({
          profileId: id,
          revision: z.number().int().positive(),
        }),
      )
      .min(1)
      .max(20),
    sourceIds: z
      .array(z.string().regex(/^[a-z0-9-]{1,60}$/))
      .min(1)
      .max(20),
  }),
  z.strictObject({
    action: z.literal('stage'),
    contractVersion: z.literal(CONTRACT_VERSION),
    runId: id,
    batchId: id,
    sourceId: z.string().regex(/^[a-z0-9-]{1,60}$/),
    observations: z.array(observationSchema).max(100),
  }),
  z.strictObject({
    action: z.literal('publish'),
    contractVersion: z.literal(CONTRACT_VERSION),
    runId: id,
    results: z
      .array(
        z.strictObject({
          sourceId: z.string().regex(/^[a-z0-9-]{1,60}$/),
          status: z.enum(['success', 'partial', 'failed']),
          coverageNote: z.string().max(1000),
          cursor: z.string().max(2000).nullable(),
        }),
      )
      .min(1)
      .max(20),
  }),
]);
export const annotationSchema = z.strictObject({
  listingId: id,
  evidenceIds: z.array(id).min(1).max(20),
  provider: z.string().max(80),
  model: z.string().max(80),
  promptVersion: z.string().max(80),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
  profileId: id,
  profileRevision: z.number().int().positive(),
  summary: z.string().max(1000),
  state: z.enum(['completed', 'deferred', 'invalidated']),
});
export type Criteria = z.infer<typeof criteriaSchema>;
export type SearchProfile = z.infer<typeof profileSchema>;
export type Listing = z.infer<typeof listingSchema>;
export type Observation = z.infer<typeof observationSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Favorite = z.infer<typeof favoriteSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type SourcePolicy = z.infer<typeof sourcePolicySchema>;
export type IngestRequest = z.infer<typeof ingestRequestSchema>;
export type ManualSubmission = z.infer<typeof manualSubmissionSchema>;
