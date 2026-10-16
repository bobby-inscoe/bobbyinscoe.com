import { describe, expect, it } from 'vitest';

import {
  factsSchema,
  listingUrlSchema,
  type SourcePolicy,
  sourcePolicySchema,
} from '@/features/house-scanner/types/contracts';

const policy: SourcePolicy = {
  sourceId: 'synthetic-fixture',
  revision: 1,
  status: 'approved',
  reviewedAt: '2026-10-12T00:00:00Z',
  reviewDueAt: '2027-01-01T00:00:00Z',
  rightsBasis: 'Authored local test fixture',
  listingOrigins: ['https://example.invalid'],
  freeOnly: true,
  automatedCollection: true,
  privateDisplay: true,
  modelProcessing: false,
  emailDigest: false,
  telegramDigest: false,
  allowedFactFields: [...factsSchema.keyof().options],
  retentionDays: 30,
  capabilities: {
    discovery: true,
    knownListingRefresh: true,
    unknownPrice: true,
    upcoming: true,
    pagination: true,
    resultCap: null,
    coverageGaps: ['Synthetic only'],
  },
  allowedEvidenceSubjects: ['nature_access'],
  imageDisplay: true,
  imageHotlink: true,
  imageOrigins: ['https://images.example.invalid'],
};

// Hosts that z.url() accepts but the URL constructor refuses. They used to
// throw out of safeParse, which turned a bad stored policy into a server error.
const HOSTS_THAT_THROW = [
  'https://example.123',
  'https://a.b.c.4',
  'https://a.0x',
  'https://xn--a',
];
// A valid URL that normalizes to 127.0.0.1, so it is a fine link but not an origin.
const HOSTS_THAT_NORMALIZE = ['https://0x7f000001', 'https://0x7f.0.0.1'];

describe('URL refinements fail validation instead of throwing', () => {
  it('accepts the plain synthetic policy', () => {
    expect(sourcePolicySchema.safeParse(policy).success).toBe(true);
  });

  it.each(HOSTS_THAT_THROW)('listing url %s', (value) => {
    expect(() => listingUrlSchema.safeParse(value)).not.toThrow();
    expect(listingUrlSchema.safeParse(value).success).toBe(false);
  });

  it.each([...HOSTS_THAT_THROW, ...HOSTS_THAT_NORMALIZE])(
    'policy origins %s',
    (value) => {
      for (const key of ['listingOrigins', 'imageOrigins'] as const) {
        const attempt = () =>
          sourcePolicySchema.safeParse({ ...policy, [key]: [value] });
        expect(attempt).not.toThrow();
        expect(attempt().success).toBe(false);
      }
    },
  );
});
