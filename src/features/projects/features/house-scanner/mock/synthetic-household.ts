import { snapshotSchema } from '@/features/projects/features/house-scanner/types/contracts';

export const DEMO_HOUSEHOLD_ID = '00000000-0000-4000-8000-000000000001';
export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000002';
export const DEMO_OTHER_USER_ID = '00000000-0000-4000-8000-000000000003';
const date = '2026-10-12T10:00:00Z';
const baseFacts = {
  propertyType: 'apartment',
  tenure: 'cooperative',
  purchase: true,
  livingAreaM2: 80,
  secondaryAreaM2: null,
  rooms: 3,
  askingPriceSek: 2800000,
  groundFloor: false,
  lift: true,
  liftServesHome: true,
  stepFree: null,
  outdoor: 'balcony',
  glazed: true,
  largePrivateTerrace: null,
  municipality: 'Example municipality',

  baseFeeSek: 4000,
  mandatoryMonthlySek: null,
  status: 'available',
};
export const SYNTHETIC_SNAPSHOT = snapshotSchema.parse({
  contractVersion: 1,
  householdId: DEMO_HOUSEHOLD_ID,
  edition: {
    id: '00000000-0000-4000-8000-000000000004',
    publishedAt: date,
    coverage: 'synthetic',
    sourceSummary: 'Fictional examples. No live sources or verified coverage.',
  },
  members: [
    {
      householdId: DEMO_HOUSEHOLD_ID,
      userId: DEMO_USER_ID,
      displayName: 'Demo Alex',
      role: 'owner',
    },
    {
      householdId: DEMO_HOUSEHOLD_ID,
      userId: DEMO_OTHER_USER_ID,
      displayName: 'Demo Morgan',
      role: 'member',
    },
  ],
  profiles: [
    {
      id: '00000000-0000-4000-8000-000000000005',
      householdId: DEMO_HOUSEHOLD_ID,
      revision: 1,
      name: 'Fictional demonstration profile',
      enabled: true,
      editedBy: DEMO_USER_ID,
      editedAt: date,
      criteria: {
        minAreaM2: 60,
        maxAreaM2: 100,
        minRooms: 2,
        preferredPriceSek: 3000000,
        stretchPriceSek: 3500000,
        propertyTypes: ['apartment', 'house'],
        excludeGroundFloor: true,
        requireLift: true,
        requireOutdoor: true,
        preferGlazing: true,
        feeReferenceSek: 5000,
        geography: {
          municipalities: ['Example municipality'],
          center: [11.97, 57.71],
          radiusKm: 20,
        },
        nature: { preferImmediateGreenery: true, preferredWalkMinutes: 15 },
        transit: {
          preferredWalkMinutes: 10,
          preferredJourneyMinutes: 30,
          tradeoffJourneyMinutes: 45,
        },
      },
    },
  ],
  listings: [
    {
      id: '00000000-0000-4000-8000-000000000010',
      title: 'Example balcony home',
      facts: baseFacts,
      coordinates: {
        longitude: 11.97,
        latitude: 57.71,
        precision: 'building',
        source: 'Fictional demo pin',
        observedAt: date,
      },
      previousAskingPriceSek: 2900000,
    },
    {
      id: '00000000-0000-4000-8000-000000000011',
      title: 'Example terrace home',
      facts: {
        ...baseFacts,
        outdoor: 'terrace',
        glazed: false,
        largePrivateTerrace: true,
        askingPriceSek: 3200000,
      },
      coordinates: {
        longitude: 11.99,
        latitude: 57.72,
        precision: 'approximate_area',
        source: 'Fictional demo area',
        observedAt: date,
      },
      previousAskingPriceSek: null,
    },
    {
      id: '00000000-0000-4000-8000-000000000012',
      title: 'Example home needing details',
      facts: { ...baseFacts, askingPriceSek: null, lift: null, glazed: null },
      coordinates: null,
      previousAskingPriceSek: null,
    },
    {
      id: '00000000-0000-4000-8000-000000000013',
      title: 'Example detached home',
      facts: {
        ...baseFacts,
        propertyType: 'house',
        tenure: 'ownership',
        lift: false,
        outdoor: 'none',
        glazed: null,
        baseFeeSek: null,
        livingAreaM2: 95,
      },
      coordinates: {
        longitude: 11.97,
        latitude: 57.71,
        precision: 'building',
        source: 'Fictional shared building point',
        observedAt: date,
      },
      previousAskingPriceSek: null,
    },
  ].map((listing) => ({
    ...listing,
    householdId: DEMO_HOUSEHOLD_ID,
    origin: 'synthetic',
    sourceUrls: [`https://example.invalid/homes/${listing.id}`],
    conflicts: [],
    evidence: [],
    photo: null,
    observedAt: date,
    addedBy: null,
    userTags: [],
  })),
  favorites: [
    {
      householdId: DEMO_HOUSEHOLD_ID,
      listingId: '00000000-0000-4000-8000-000000000010',
      userId: DEMO_OTHER_USER_ID,
      savedAt: date,
    },
  ],
});
