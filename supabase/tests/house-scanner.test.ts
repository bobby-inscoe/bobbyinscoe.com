import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { z } from 'zod';
import {
  type Criteria,
  criteriaSchema,
  type IngestRequest,
  ingestRequestSchema,
  type Observation,
  observationSchema,
  type SourcePolicy,
  snapshotSchema,
  sourcePolicySchema,
} from '@/features/house-scanner/types/contracts';

const HOUSE_A = '10000000-0000-4000-8000-000000000001';
const HOUSE_B = '10000000-0000-4000-8000-000000000002';
const OWNER_A = '20000000-0000-4000-8000-000000000001';
const MEMBER_A = '20000000-0000-4000-8000-000000000002';
const OWNER_B = '20000000-0000-4000-8000-000000000003';
const PROFILE_A = '30000000-0000-4000-8000-000000000001';
const PROFILE_B = '30000000-0000-4000-8000-000000000002';
const KEY_A = 'synthetic-key-a';
const KEY_B = 'synthetic-key-b';
const ORIGIN = 'https://example.invalid';
const HOUR = 3_600_000;
const criteria: Criteria = criteriaSchema.parse({
  minAreaM2: 50,
  maxAreaM2: null,
  minRooms: 2,
  preferredPriceSek: 2_000_000,
  stretchPriceSek: 3_000_000,
  propertyTypes: ['apartment', 'house'],
  excludeGroundFloor: false,
  requireLift: false,
  requireOutdoor: false,
  preferGlazing: false,
  feeReferenceSek: 4000,
  geography: {
    municipalities: ['Synthetic municipality'],
    center: [0, 0],
    radiusKm: 10,
  },
  nature: { preferImmediateGreenery: false, preferredWalkMinutes: 10 },
  transit: {
    preferredWalkMinutes: 10,
    preferredJourneyMinutes: 30,
    tradeoffJourneyMinutes: 60,
  },
});
const ingestResultSchema = z.strictObject({
  runId: z.uuid(),
  state: z.enum(['staging', 'published', 'failed']),
  editionId: z.uuid().nullable().optional(),
});
const noteListSchema = z.array(
  z.strictObject({
    userId: z.uuid(),
    body: z.string(),
    revision: z.number().int(),
    editedAt: z.iso.datetime({ offset: true }),
  }),
);
let db: PGlite;
let baseTime: number;

function policy(sourceId: string): SourcePolicy {
  return sourcePolicySchema.parse({
    sourceId,
    revision: 1,
    status: 'approved',
    reviewedAt: new Date(baseTime - HOUR).toISOString(),
    reviewDueAt: new Date(baseTime + 30 * 24 * HOUR).toISOString(),
    rightsBasis: 'Synthetic local test permission',
    listingOrigins: [ORIGIN],
    imageOrigins: [ORIGIN],
    allowedEvidenceSubjects: ['facts', 'nearby_nature'],
    freeOnly: true,
    automatedCollection: true,
    privateDisplay: true,
    imageDisplay: true,
    imageHotlink: true,
    modelProcessing: false,
    emailDigest: false,
    telegramDigest: false,
    allowedFactFields: [
      'propertyType',
      'tenure',
      'purchase',
      'livingAreaM2',
      'secondaryAreaM2',
      'rooms',
      'askingPriceSek',
      'groundFloor',
      'lift',
      'liftServesHome',
      'stepFree',
      'outdoor',
      'glazed',
      'largePrivateTerrace',
      'municipality',
      'baseFeeSek',
      'mandatoryMonthlySek',
      'status',
    ],
    retentionDays: 30,
    capabilities: {
      discovery: true,
      knownListingRefresh: true,
      unknownPrice: true,
      upcoming: true,
      pagination: true,
      resultCap: null,
      coverageGaps: [],
    },
  });
}

function observation(overrides: Partial<Observation> = {}): Observation {
  return observationSchema.parse({
    sourceListingId: 'synthetic-home',
    episodeId: 'synthetic-episode',
    sourceUrl: `${ORIGIN}/home`,
    title: 'Synthetic home',
    observedAt: new Date(baseTime).toISOString(),
    publishedAt: null,
    facts: {
      propertyType: 'apartment',
      tenure: 'cooperative',
      purchase: true,
      livingAreaM2: 60,
      secondaryAreaM2: null,
      rooms: 2,
      askingPriceSek: null,
      groundFloor: null,
      lift: null,
      liftServesHome: null,
      stepFree: null,
      outdoor: null,
      glazed: null,
      largePrivateTerrace: null,
      municipality: 'Synthetic municipality',
      baseFeeSek: null,
      mandatoryMonthlySek: null,
      status: 'available',
    },
    conflicts: [],
    coordinates: null,
    evidence: [],
    photo: null,
    ...overrides,
  });
}

type Role = 'anon' | 'authenticated' | 'service_role';
const roleSql: Record<Role, string> = {
  anon: 'set role anon',
  authenticated: 'set role authenticated',
  service_role: 'set role service_role',
};

async function asRole<T>(
  role: Role,
  userId: string | null,
  action: () => Promise<T>,
) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    userId ?? '',
  ]);
  await db.exec(roleSql[role]);
  try {
    return await action();
  } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

async function rpc(
  sql: string,
  params: (string | number | boolean | null)[] = [],
) {
  const result = await db.query<{ value: unknown }>(sql, params);
  expect(result.rows).toHaveLength(1);
  return result.rows[0].value;
}

async function snapshot(householdId = HOUSE_A, userId = OWNER_A) {
  return asRole('authenticated', userId, async () =>
    snapshotSchema.parse(
      await rpc('select public.hs_snapshot($1) as value', [householdId]),
    ),
  );
}

async function manual(
  householdId = HOUSE_A,
  userId = OWNER_A,
  url = `${ORIGIN}/bookmark`,
  note = '',
) {
  return asRole('authenticated', userId, async () =>
    z
      .strictObject({ listingId: z.uuid(), existing: z.boolean() })
      .parse(
        await rpc(
          'select public.hs_add_manual($1,$2,$3,$4,$5::jsonb) as value',
          [
            householdId,
            url,
            'Synthetic bookmark',
            note,
            JSON.stringify(['test']),
          ],
        ),
      ),
  );
}

async function favorite(
  listingId: string,
  saved: boolean,
  userId = OWNER_A,
  householdId = HOUSE_A,
) {
  return asRole('authenticated', userId, () =>
    rpc('select public.hs_set_favorite($1,$2,$3) as value', [
      householdId,
      listingId,
      saved,
    ]),
  );
}

async function saveNote(
  listingId: string,
  userId: string,
  body: string,
  revision: number,
  householdId = HOUSE_A,
) {
  return asRole('authenticated', userId, async () =>
    z
      .strictObject({ revision: z.number().int() })
      .parse(
        await rpc('select public.hs_save_note($1,$2,$3,$4) as value', [
          householdId,
          listingId,
          body,
          revision,
        ]),
      ),
  );
}

async function notes(
  listingId: string,
  userId = OWNER_A,
  householdId = HOUSE_A,
) {
  return asRole('authenticated', userId, async () =>
    noteListSchema.parse(
      await rpc('select public.hs_notes($1,$2) as value', [
        householdId,
        listingId,
      ]),
    ),
  );
}

async function saveProfile(
  userId = OWNER_A,
  revision = 1,
  nextCriteria: Criteria = criteria,
) {
  return asRole('authenticated', userId, () =>
    rpc('select public.hs_save_profile($1,$2,$3,$4,$5,$6::jsonb) as value', [
      HOUSE_A,
      PROFILE_A,
      revision,
      'Updated synthetic profile',
      true,
      JSON.stringify(nextCriteria),
    ]),
  );
}

async function ingest(request: IngestRequest, key = KEY_A, hash?: string) {
  const body = JSON.stringify(ingestRequestSchema.parse(request));
  return asRole('service_role', null, async () =>
    ingestResultSchema.parse(
      await rpc('select public.hs_ingest($1,$2,$3::jsonb) as value', [
        key,
        hash ?? createHash('sha256').update(body).digest('hex'),
        body,
      ]),
    ),
  );
}

function beginRequest(
  runId = randomUUID(),
  sourceIds = ['alpha'],
  profileId = PROFILE_A,
): Extract<IngestRequest, { action: 'begin' }> {
  return {
    action: 'begin',
    contractVersion: 1,
    runId,
    sourceIds,
    profileVersions: [{ profileId, revision: 1 }],
  };
}

function stageRequest(
  runId: string,
  observations = [observation()],
  sourceId = 'alpha',
  batchId = randomUUID(),
): Extract<IngestRequest, { action: 'stage' }> {
  return {
    action: 'stage',
    contractVersion: 1,
    runId,
    batchId,
    sourceId,
    observations,
  };
}

function publishRequest(
  runId: string,
  sourceIds = ['alpha'],
  status: 'success' | 'partial' | 'failed' = 'success',
): Extract<IngestRequest, { action: 'publish' }> {
  return {
    action: 'publish',
    contractVersion: 1,
    runId,
    results: sourceIds.map((sourceId) => ({
      sourceId,
      status,
      coverageNote: 'Synthetic local coverage',
      cursor: `cursor-${sourceId}`,
    })),
  };
}

async function publishOne(value = observation(), source = 'alpha') {
  const begin = beginRequest(randomUUID(), [source]);
  await ingest(begin);
  await ingest(stageRequest(begin.runId, [value], source));
  return ingest(publishRequest(begin.runId, [source]));
}

async function count(sql: string, params: string[] = []) {
  const result = await db.query<{ count: number }>(sql, params);
  return result.rows[0].count;
}

beforeAll(async () => {
  db = await PGlite.create();
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.reject(
        new Error('Network is disabled in database behavior tests'),
      ),
    ),
  );
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `);
  await db.exec(
    await readFile(
      new URL('../migrations/202610120001_house_scanner.sql', import.meta.url),
      'utf8',
    ),
  );
});

afterAll(async () => {
  await db?.close();
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.reject(
        new Error('Network is disabled in database behavior tests'),
      ),
    ),
  );
  baseTime = Date.now() - 4 * HOUR;
  await db.exec('truncate hs.households, auth.users cascade');
  for (const id of [OWNER_A, MEMBER_A, OWNER_B])
    await db.query('insert into auth.users values($1)', [id]);
  for (const id of [HOUSE_A, HOUSE_B])
    await db.query('insert into hs.households(id,name) values($1,$2)', [
      id,
      'Synthetic household',
    ]);
  for (const [household, user, role] of [
    [HOUSE_A, OWNER_A, 'owner'],
    [HOUSE_A, MEMBER_A, 'member'],
    [HOUSE_B, OWNER_B, 'owner'],
  ]) {
    await db.query(
      'insert into hs.members(household_id,user_id,display_name,role) values($1,$2,$3,$4)',
      [household, user, 'Synthetic member', role],
    );
  }
  for (const [id, household, actor] of [
    [PROFILE_A, HOUSE_A, OWNER_A],
    [PROFILE_B, HOUSE_B, OWNER_B],
  ]) {
    await db.query(
      'insert into hs.profiles(id,household_id,name,enabled,criteria,edited_by) values($1,$2,$3,true,$4::jsonb,$5)',
      [id, household, 'Synthetic profile', JSON.stringify(criteria), actor],
    );
  }
  for (const household of [HOUSE_A, HOUSE_B]) {
    for (const source of ['alpha', 'beta']) {
      await db.query(
        'insert into hs.source_policies(household_id,source_id,policy,cursor) values($1,$2,$3::jsonb,$4)',
        [household, source, JSON.stringify(policy(source)), 'previous-cursor'],
      );
    }
  }
  for (const [key, household] of [
    [KEY_A, HOUSE_A],
    [KEY_B, HOUSE_B],
  ]) {
    await db.query(
      "insert into hs.ingest_credentials(key_id,household_id,source_ids,expires_at) values($1,$2,array['alpha','beta'],now()+interval '1 day')",
      [key, household],
    );
  }
});

describe('actual migration and private RPC grants', () => {
  it('installs every private table with RLS and no browser or service table grants', async () => {
    const result = await db.query<{
      table_name: string;
      relrowsecurity: boolean;
      browser: boolean;
      service: boolean;
    }>(`
      select c.relname table_name,c.relrowsecurity,
        has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') browser,
        has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE') service
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='hs' and c.relkind='r'
    `);
    expect(result.rows).toHaveLength(15);
    for (const row of result.rows)
      expect(row).toMatchObject({
        relrowsecurity: true,
        browser: false,
        service: false,
      });
    for (const role of [
      'anon',
      'authenticated',
      'service_role',
    ] satisfies Role[]) {
      await expect(
        asRole(role, OWNER_A, () => db.query('select * from hs.members')),
      ).rejects.toThrow('permission denied for schema hs');
    }
  });

  it('grants browser and service RPCs only to their intended roles', async () => {
    const result = await db.query<{
      proname: string;
      anon: boolean;
      browser: boolean;
      service: boolean;
    }>(`
      select p.proname,has_function_privilege('anon',p.oid,'EXECUTE') anon,
        has_function_privilege('authenticated',p.oid,'EXECUTE') browser,
        has_function_privilege('service_role',p.oid,'EXECUTE') service
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname like 'hs_%'
    `);
    expect(result.rows).toHaveLength(11);
    const serviceFunctions = [
      'hs_ingest_credential',
      'hs_consume_nonce',
      'hs_ingest_policies',
      'hs_ingest',
    ];
    for (const row of result.rows)
      expect(row).toMatchObject({
        anon: false,
        browser: !serviceFunctions.includes(row.proname),
        service: serviceFunctions.includes(row.proname),
      });
    await expect(
      asRole('anon', null, () =>
        rpc('select public.hs_memberships() as value'),
      ),
    ).rejects.toThrow('permission denied for function hs_memberships');
    await expect(
      asRole('authenticated', OWNER_A, () =>
        rpc('select public.hs_ingest_credential($1) as value', [KEY_A]),
      ),
    ).rejects.toThrow('permission denied for function hs_ingest_credential');
    await expect(
      asRole('service_role', null, () =>
        rpc('select public.hs_snapshot($1) as value', [HOUSE_A]),
      ),
    ).rejects.toThrow('permission denied for function hs_snapshot');
  });
});

describe('current household membership and actor ownership', () => {
  it('isolates snapshots, memberships, bookmarks, saves and notes across two households', async () => {
    const a = await manual(HOUSE_A, OWNER_A, `${ORIGIN}/a`, 'House A note');
    const b = await manual(HOUSE_B, OWNER_B, `${ORIGIN}/b`, 'House B note');
    await favorite(a.listingId, true);
    await favorite(b.listingId, true, OWNER_B, HOUSE_B);
    expect((await snapshot()).listings.map((item) => item.id)).toEqual([
      a.listingId,
    ]);
    expect(
      (await snapshot(HOUSE_B, OWNER_B)).listings.map((item) => item.id),
    ).toEqual([b.listingId]);
    const memberships = await asRole('authenticated', OWNER_A, () =>
      rpc('select public.hs_memberships() as value'),
    );
    expect(memberships).toEqual([
      {
        householdId: HOUSE_A,
        userId: OWNER_A,
        displayName: 'Synthetic member',
        role: 'owner',
      },
    ]);
    await expect(snapshot(HOUSE_B)).rejects.toThrow('Household access denied');
    await expect(manual(HOUSE_B)).rejects.toThrow('Household access denied');
    await expect(favorite(b.listingId, true)).rejects.toThrow(
      'Listing unavailable',
    );
    await expect(
      saveNote(b.listingId, OWNER_A, 'Wrong household', 0),
    ).rejects.toThrow('Note changed');
    expect(await notes(b.listingId)).toEqual([]);
    await expect(notes(b.listingId, OWNER_A, HOUSE_B)).rejects.toThrow(
      'Household access denied',
    );
    expect((await notes(b.listingId, OWNER_B, HOUSE_B))[0].body).toBe(
      'House B note',
    );
  });

  it('revokes existing-session access immediately without removing user-authored records', async () => {
    const { listingId } = await manual(
      HOUSE_A,
      MEMBER_A,
      `${ORIGIN}/member`,
      'Retained note',
    );
    await favorite(listingId, true, MEMBER_A);
    await db.query('update hs.members set active=false where user_id=$1', [
      MEMBER_A,
    ]);
    await expect(snapshot(HOUSE_A, MEMBER_A)).rejects.toThrow(
      'Household access denied',
    );
    await expect(favorite(listingId, false, MEMBER_A)).rejects.toThrow(
      'Household access denied',
    );
    await expect(
      saveNote(listingId, MEMBER_A, 'Revoked edit', 1),
    ).rejects.toThrow('Household access denied');
    await expect(manual(HOUSE_A, MEMBER_A)).rejects.toThrow(
      'Household access denied',
    );
    expect(
      await asRole('authenticated', MEMBER_A, () =>
        rpc('select public.hs_memberships() as value'),
      ),
    ).toEqual([]);
    expect((await notes(listingId))[0].body).toBe('Retained note');
    expect((await snapshot()).favorites[0].userId).toBe(MEMBER_A);
    await expect(
      asRole('authenticated', null, () =>
        rpc('select public.hs_snapshot($1) as value', [HOUSE_A]),
      ),
    ).rejects.toThrow('Household access denied');
  });

  it('keeps each actor save independent and makes repeated saves idempotent', async () => {
    const { listingId } = await manual();
    await favorite(listingId, true);
    await favorite(listingId, true);
    await favorite(listingId, true, MEMBER_A);
    expect((await snapshot()).favorites).toHaveLength(2);
    await favorite(listingId, false);
    await favorite(listingId, false);
    expect((await snapshot()).favorites.map((item) => item.userId)).toEqual([
      MEMBER_A,
    ]);
  });

  it('edits only the actor note and rejects stale revisions', async () => {
    const { listingId } = await manual();
    expect(await saveNote(listingId, OWNER_A, 'Owner note', 0)).toEqual({
      revision: 1,
    });
    expect(await saveNote(listingId, MEMBER_A, 'Member note', 0)).toEqual({
      revision: 1,
    });
    expect(await saveNote(listingId, MEMBER_A, 'Member revision', 1)).toEqual({
      revision: 2,
    });
    await expect(
      saveNote(listingId, MEMBER_A, 'Stale edit', 1),
    ).rejects.toMatchObject({ code: '40001' });
    await expect(
      saveNote(listingId, OWNER_A, 'Duplicate insert', 0),
    ).rejects.toMatchObject({ code: '40001' });
    expect(await notes(listingId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: OWNER_A,
          body: 'Owner note',
          revision: 1,
        }),
        expect.objectContaining({
          userId: MEMBER_A,
          body: 'Member revision',
          revision: 2,
        }),
      ]),
    );
  });

  it('allows profile changes only for the current owner at the current revision', async () => {
    await expect(saveProfile(MEMBER_A)).rejects.toThrow(
      'Household access denied',
    );
    await expect(saveProfile(OWNER_B)).rejects.toThrow(
      'Household access denied',
    );
    expect(await saveProfile()).toEqual({ revision: 2 });
    await expect(saveProfile()).rejects.toMatchObject({ code: '40001' });
    expect((await snapshot()).profiles[0]).toMatchObject({
      revision: 2,
      editedBy: OWNER_A,
    });
    expect(
      await count(
        'select count(*)::int count from hs.profile_versions where profile_id=$1',
        [PROFILE_A],
      ),
    ).toBe(2);
  });

  it('deduplicates manual URLs and leaves their user title, tags and note intact after ingestion', async () => {
    const first = await manual(
      HOUSE_A,
      OWNER_A,
      `${ORIGIN}/manual`,
      'Personal note',
    );
    expect(
      await manual(HOUSE_A, MEMBER_A, `${ORIGIN}/manual`, 'Different note'),
    ).toEqual({ listingId: first.listingId, existing: true });
    await favorite(first.listingId, true);
    await publishOne();
    const item = (await snapshot()).listings.find(
      (listing) => listing.id === first.listingId,
    );
    expect(item).toMatchObject({
      origin: 'manual',
      title: 'Synthetic bookmark',
      userTags: ['test'],
      addedBy: OWNER_A,
    });
    expect(await notes(first.listingId)).toEqual([
      expect.objectContaining({ body: 'Personal note', userId: OWNER_A }),
    ]);
    expect((await snapshot()).favorites[0].listingId).toBe(first.listingId);
  });

  it('rejects credential-bearing bookmarks and UTF-16 length overflow without partial records', async () => {
    await expect(
      manual(HOUSE_A, OWNER_A, 'https://user:pass@example.invalid/home'),
    ).rejects.toThrow('Invalid bookmark');
    await expect(
      manual(HOUSE_A, OWNER_A, `${ORIGIN}/long`, '😀'.repeat(1001)),
    ).rejects.toThrow('Invalid bookmark');
    expect((await snapshot()).listings).toEqual([]);
  });
});

describe('service credential, nonce and exact replay checks', () => {
  it('returns only credential-scoped policies and denies expired, revoked or unscoped credentials', async () => {
    const credential = await asRole('service_role', null, () =>
      rpc('select public.hs_ingest_credential($1) as value', [KEY_A]),
    );
    expect(credential).toEqual({
      householdId: HOUSE_A,
      sourceIds: ['alpha', 'beta'],
      scopes: ['ingest'],
    });
    await db.query(
      "update hs.ingest_credentials set source_ids=array['alpha'] where key_id=$1",
      [KEY_A],
    );
    const policies = await asRole('service_role', null, () =>
      rpc('select public.hs_ingest_policies($1) as value', [KEY_A]),
    );
    expect(
      z
        .array(sourcePolicySchema)
        .parse(policies)
        .map((item) => item.sourceId),
    ).toEqual(['alpha']);
    await expect(ingest(beginRequest(randomUUID(), ['beta']))).rejects.toThrow(
      'Invalid source set',
    );
    for (const update of [
      "update hs.ingest_credentials set revoked_at=now(),expires_at=now()+interval '1 day',scopes=array['ingest'] where key_id=$1",
      "update hs.ingest_credentials set revoked_at=null,expires_at=now()-interval '1 second',scopes=array['ingest'] where key_id=$1",
      "update hs.ingest_credentials set revoked_at=null,expires_at=now()+interval '1 day',scopes=array[]::text[] where key_id=$1",
    ]) {
      await db.query(update, [KEY_A]);
      expect(
        await asRole('service_role', null, () =>
          rpc('select public.hs_ingest_credential($1) as value', [KEY_A]),
        ),
      ).toBeNull();
      await expect(ingest(beginRequest())).rejects.toMatchObject({
        code: '42501',
      });
    }
  });

  it('consumes a nonce once per key and rejects replay, stale timestamps and revoked keys', async () => {
    const nonce = 'synthetic_nonce_0001';
    const consume = (key: string, timestamp = Math.floor(Date.now() / 1000)) =>
      asRole('service_role', null, () =>
        rpc('select public.hs_consume_nonce($1,$2,$3) as value', [
          key,
          nonce,
          timestamp,
        ]),
      );
    expect(await consume(KEY_A)).toEqual({ ok: true });
    await expect(consume(KEY_A)).rejects.toMatchObject({ code: '23505' });
    expect(await consume(KEY_B)).toEqual({ ok: true });
    await expect(
      consume(KEY_A, Math.floor(Date.now() / 1000) - 301),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      consume(KEY_A, Math.floor(Date.now() / 1000) + 301),
    ).rejects.toMatchObject({ code: '42501' });
    await db.query(
      'update hs.ingest_credentials set revoked_at=now() where key_id=$1',
      [KEY_A],
    );
    await expect(consume(KEY_A)).rejects.toMatchObject({ code: '42501' });
    expect(
      await count('select count(*)::int count from hs.ingest_nonces'),
    ).toBe(2);
  });

  it('accepts identical begin, batch and publication replays with no duplicate effects', async () => {
    const begin = beginRequest();
    const stage = stageRequest(begin.runId);
    const publish = publishRequest(begin.runId);
    expect(await ingest(begin)).toEqual(await ingest(begin));
    expect(await ingest(stage)).toEqual(await ingest(stage));
    const published = await ingest(publish);
    expect(published.state).toBe('published');
    expect(await ingest(publish)).toEqual(published);
    expect((await ingest(stage)).state).toBe('published');
    expect(await count('select count(*)::int count from hs.batches')).toBe(1);
    expect(await count('select count(*)::int count from hs.observations')).toBe(
      1,
    );
    expect(await count('select count(*)::int count from hs.editions')).toBe(1);
  });

  it('rejects changed run, batch and publish content and cross-household run reuse', async () => {
    const begin = beginRequest();
    await ingest(begin);
    await expect(ingest({ ...begin, sourceIds: ['beta'] })).rejects.toThrow(
      'Run ID reused',
    );
    await expect(
      ingest(
        { ...begin, profileVersions: [{ profileId: PROFILE_B, revision: 1 }] },
        KEY_B,
      ),
    ).rejects.toThrow('Run ID reused');
    const stage = stageRequest(begin.runId);
    await ingest(stage);
    await expect(
      ingest({
        ...stage,
        observations: [observation({ title: 'Changed content' })],
      }),
    ).rejects.toThrow('Batch ID reused');
    await expect(ingest(stage, KEY_B)).rejects.toThrow('Run unavailable');
    const publish = publishRequest(begin.runId);
    await ingest(publish);
    await expect(
      ingest(publishRequest(begin.runId, ['alpha'], 'partial')),
    ).rejects.toThrow('Publish ID reused');
    expect((await snapshot()).listings[0].title).toBe('Synthetic home');
  });

  it('requires unique exact source sets and the current complete enabled-profile revision set', async () => {
    await expect(
      ingest(beginRequest(randomUUID(), ['alpha', 'alpha'])),
    ).rejects.toThrow('Invalid source set');
    await expect(
      ingest({
        ...beginRequest(),
        profileVersions: [{ profileId: PROFILE_A, revision: 2 }],
      }),
    ).rejects.toThrow('Profiles changed or incomplete');
    const begin = beginRequest(randomUUID(), ['alpha', 'beta']);
    await ingest(begin);
    await ingest(stageRequest(begin.runId));
    await expect(ingest(publishRequest(begin.runId))).rejects.toThrow(
      'Results must match exact run source set',
    );
    await expect(
      ingest(publishRequest(begin.runId, ['alpha', 'alpha'])),
    ).rejects.toThrow('Results must match exact run source set');
    await expect(
      ingest(stageRequest(begin.runId, [observation()], 'outside-scope')),
    ).rejects.toThrow('Source not in run');
  });

  it('rejects same-time contradictions inside staging and in previously published history', async () => {
    const original = observation();
    const begin = beginRequest();
    await ingest(begin);
    const contradiction = observation({
      title: 'Contradictory same-time title',
    });
    await expect(
      ingest(stageRequest(begin.runId, [original, contradiction])),
    ).rejects.toThrow('Conflicting same-time observation');
    expect(await count('select count(*)::int count from hs.batches')).toBe(0);
    expect(
      await count('select count(*)::int count from hs.staged_observations'),
    ).toBe(0);
    await ingest(stageRequest(begin.runId, [original]));
    await ingest(publishRequest(begin.runId));
    await publishOne(
      observation({
        observedAt: new Date(baseTime + HOUR).toISOString(),
        title: 'Newer title',
      }),
    );
    const replay = beginRequest();
    await ingest(replay);
    await ingest(stageRequest(replay.runId, [contradiction]));
    await expect(ingest(publishRequest(replay.runId))).rejects.toThrow(
      'Conflicting historical same-time observation',
    );
    expect((await snapshot()).listings[0].title).toBe('Newer title');
  });
});

describe('atomic publication and source failure handling', () => {
  it('rolls back listing writes, cursors, edition and run closure when a later source loses permission', async () => {
    const begin = beginRequest(randomUUID(), ['alpha', 'beta']);
    await ingest(begin);
    await ingest(stageRequest(begin.runId));
    await ingest(
      stageRequest(
        begin.runId,
        [observation({ sourceListingId: 'beta-home' })],
        'beta',
      ),
    );
    await db.query(
      "update hs.source_policies set policy=jsonb_set(policy,'{status}','\"disabled\"') where household_id=$1 and source_id='beta'",
      [HOUSE_A],
    );
    await expect(
      ingest(publishRequest(begin.runId, ['alpha', 'beta'])),
    ).rejects.toThrow('Source permission changed');
    expect((await snapshot()).listings).toEqual([]);
    expect(await count('select count(*)::int count from hs.observations')).toBe(
      0,
    );
    expect(await count('select count(*)::int count from hs.editions')).toBe(0);
    const state = await db.query<{ state: string }>(
      'select state from hs.runs where id=$1',
      [begin.runId],
    );
    expect(state.rows[0].state).toBe('staging');
    const cursors = await db.query<{ cursor: string }>(
      'select cursor from hs.source_policies where household_id=$1',
      [HOUSE_A],
    );
    expect(cursors.rows.map((item) => item.cursor)).toEqual([
      'previous-cursor',
      'previous-cursor',
    ]);
    await db.query(
      'update hs.source_policies set policy=$1::jsonb where household_id=$2 and source_id=$3',
      [JSON.stringify(policy('beta')), HOUSE_A, 'beta'],
    );
    expect(
      (await ingest(publishRequest(begin.runId, ['alpha', 'beta']))).state,
    ).toBe('published');
    expect((await snapshot()).listings).toHaveLength(2);
  });

  it('preserves previous failed-source facts and cursors while publishing successful sources as partial', async () => {
    await publishOne(
      observation({
        sourceListingId: 'beta-home',
        title: 'Previous beta title',
      }),
      'beta',
    );
    const begin = beginRequest(randomUUID(), ['alpha', 'beta']);
    await ingest(begin);
    await ingest(stageRequest(begin.runId));
    await ingest(
      stageRequest(
        begin.runId,
        [
          observation({
            sourceListingId: 'beta-home',
            title: 'Ignored beta title',
            observedAt: new Date(baseTime + HOUR).toISOString(),
          }),
        ],
        'beta',
      ),
    );
    const publish = publishRequest(begin.runId, ['alpha', 'beta']);
    publish.results[1] = {
      sourceId: 'beta',
      status: 'failed',
      coverageNote: 'Synthetic failed fetch',
      cursor: 'must-not-commit',
    };
    await ingest(publish);
    const state = await snapshot();
    expect(state.listings.map((item) => item.title)).toEqual(
      expect.arrayContaining(['Previous beta title', 'Synthetic home']),
    );
    expect(state.edition?.coverage).toBe('partial');
    const cursor = await db.query<{ cursor: string }>(
      "select cursor from hs.source_policies where household_id=$1 and source_id='beta'",
      [HOUSE_A],
    );
    expect(cursor.rows[0].cursor).toBe('cursor-beta');
  });

  it('keeps the last good edition when every source fails and makes the failed replay stable', async () => {
    const previous = await publishOne();
    const begin = beginRequest();
    await ingest(begin);
    const publish = publishRequest(begin.runId, ['alpha'], 'failed');
    const failed = await ingest(publish);
    expect(failed).toEqual({
      runId: begin.runId,
      state: 'failed',
      editionId: null,
    });
    expect(await ingest(publish)).toEqual(failed);
    expect((await snapshot()).edition?.id).toBe(previous.editionId);
    expect((await snapshot()).listings).toHaveLength(1);
  });

  it('rejects successful or partial empty-placeholder fetches', async () => {
    const begin = beginRequest();
    await ingest(begin);
    await ingest(stageRequest(begin.runId, []));
    await expect(ingest(publishRequest(begin.runId))).rejects.toThrow(
      'Empty results lack coverage proof',
    );
    await expect(
      ingest(publishRequest(begin.runId, ['alpha'], 'partial')),
    ).rejects.toThrow('Empty results lack coverage proof');
    expect((await snapshot()).edition).toBeNull();
    expect((await snapshot()).listings).toEqual([]);
  });

  it('rejects publication when the owner changed the profile since run start', async () => {
    const begin = beginRequest();
    await ingest(begin);
    await ingest(stageRequest(begin.runId));
    await saveProfile();
    await expect(ingest(publishRequest(begin.runId))).rejects.toThrow(
      'Profiles changed before publication',
    );
    expect((await snapshot()).listings).toEqual([]);
    expect(await count('select count(*)::int count from hs.observations')).toBe(
      0,
    );
  });
});

describe('unknown prices, provenance expiry and user bookmark preservation', () => {
  it('preserves unknown prices and records only comparable same-episode asking-price changes', async () => {
    const original = observation();
    await publishOne(original);
    expect((await snapshot()).listings[0]).toMatchObject({
      facts: { askingPriceSek: null },
      previousAskingPriceSek: null,
    });
    const known = observation({
      observedAt: new Date(baseTime + HOUR).toISOString(),
      facts: { ...original.facts, askingPriceSek: 2_500_000 },
    });
    await publishOne(known);
    expect((await snapshot()).listings[0].previousAskingPriceSek).toBeNull();
    const lower = observation({
      observedAt: new Date(baseTime + 2 * HOUR).toISOString(),
      facts: { ...original.facts, askingPriceSek: 2_000_000 },
    });
    await publishOne(lower);
    expect((await snapshot()).listings[0]).toMatchObject({
      facts: { askingPriceSek: 2_000_000 },
      previousAskingPriceSek: 2_500_000,
    });
    await publishOne(
      observation({
        episodeId: 'new-episode',
        observedAt: new Date(baseTime + 2 * HOUR).toISOString(),
        facts: { ...original.facts, askingPriceSek: 1_900_000 },
      }),
    );
    expect(
      (await snapshot()).listings.find(
        (item) => item.facts.askingPriceSek === 1_900_000,
      )?.previousAskingPriceSek,
    ).toBeNull();
    await publishOne(
      observation({ observedAt: new Date(baseTime + 3 * HOUR).toISOString() }),
    );
    const unknown = (await snapshot()).listings.find(
      (item) => item.facts.askingPriceSek === null,
    );
    expect(unknown?.previousAskingPriceSek).toBeNull();
    expect(await count('select count(*)::int count from hs.observations')).toBe(
      5,
    );
  });

  it('refreshes checked timestamps without a fact revision for unchanged content', async () => {
    const original = observation();
    await publishOne(original);
    await publishOne(
      observation({ observedAt: new Date(baseTime + HOUR).toISOString() }),
    );
    expect(await count('select count(*)::int count from hs.observations')).toBe(
      1,
    );
    const row = await db.query<{ revision: number; observed_at: Date }>(
      'select revision,observed_at from hs.listings',
    );
    expect(row.rows[0].revision).toBe(1);
    expect(new Date(row.rows[0].observed_at).getTime()).toBe(baseTime + HOUR);
  });

  it('rejects disallowed facts, foreign provenance and nested evidence outside retention before staging', async () => {
    await db.query(
      "update hs.source_policies set policy=jsonb_set(policy,'{allowedFactFields}', '[\"askingPriceSek\"]') where household_id=$1 and source_id='alpha'",
      [HOUSE_A],
    );
    const begin = beginRequest();
    await ingest(begin);
    await expect(ingest(stageRequest(begin.runId))).rejects.toThrow(
      'Fact field not permitted',
    );
    await db.query(
      'update hs.source_policies set policy=$1::jsonb where household_id=$2 and source_id=$3',
      [JSON.stringify(policy('alpha')), HOUSE_A, 'alpha'],
    );
    await expect(
      ingest(
        stageRequest(begin.runId, [
          observation({ sourceUrl: 'https://foreign.invalid/home' }),
        ]),
      ),
    ).rejects.toThrow('Source permission or observation time invalid');
    await expect(
      ingest(
        stageRequest(begin.runId, [
          observation({
            coordinates: {
              longitude: 0,
              latitude: 0,
              precision: 'address',
              source: 'Synthetic coordinates',
              observedAt: new Date(baseTime - 31 * 24 * HOUR).toISOString(),
            },
          }),
        ]),
      ),
    ).rejects.toThrow('Evidence, coordinate or photo outside retention');
    await expect(
      ingest(
        stageRequest(begin.runId, [
          observation({
            evidence: [
              {
                id: randomUUID(),
                kind: 'source_claim',
                subject: 'facts',
                summary: 'Synthetic evidence',
                sourceUrl: 'https://foreign.invalid/home',
                observedAt: new Date(baseTime).toISOString(),
                datasetVersion: null,
                method: null,
                value: null,
                unit: null,
              },
            ],
          }),
        ]),
      ),
    ).rejects.toThrow('Evidence not permitted');
    expect(await count('select count(*)::int count from hs.batches')).toBe(0);
  });

  it('redacts expired rights and retains only user bookmark URLs, saves and notes', async () => {
    const original = observation({
      coordinates: {
        longitude: 0,
        latitude: 0,
        precision: 'address',
        source: 'Synthetic coordinates',
        observedAt: new Date(baseTime).toISOString(),
      },
      evidence: [
        {
          id: randomUUID(),
          kind: 'source_claim',
          subject: 'facts',
          summary: 'Synthetic evidence',
          sourceUrl: `${ORIGIN}/home`,
          observedAt: new Date(baseTime).toISOString(),
          datasetVersion: null,
          method: null,
          value: null,
          unit: null,
        },
      ],
      photo: {
        url: `${ORIGIN}/photo`,
        attribution: 'Synthetic image',
        rightsBasis: 'Synthetic permission',
        observedAt: new Date(baseTime).toISOString(),
        expiresAt: new Date(baseTime + 24 * HOUR).toISOString(),
        displayAllowed: true,
        hotlinkAllowed: true,
      },
    });
    await publishOne(original);
    await publishOne(
      observation({
        sourceListingId: 'unsaved-home',
        sourceUrl: `${ORIGIN}/unsaved`,
      }),
    );
    const id = (await snapshot()).listings.find(
      (item) => item.sourceUrls[0] === original.sourceUrl,
    )?.id;
    expect(id).toBeDefined();
    if (!id) throw new Error('Published synthetic home missing');
    await favorite(id, true);
    await saveNote(id, MEMBER_A, 'Personal note survives source expiry', 0);
    await db.query(
      "update hs.source_policies set policy=jsonb_set(policy,'{reviewDueAt}',to_jsonb((now()-interval '1 second')::text)) where household_id=$1",
      [HOUSE_A],
    );
    const state = await snapshot();
    expect(state.listings).toHaveLength(1);
    expect(state.listings[0]).toMatchObject({
      id,
      title: 'Saved listing: source facts unavailable',
      sourceUrls: [`${ORIGIN}/home`],
      facts: { askingPriceSek: null, livingAreaM2: null, municipality: null },
      coordinates: null,
      evidence: [],
      photo: null,
      previousAskingPriceSek: null,
    });
    expect(state.favorites[0]).toMatchObject({
      listingId: id,
      userId: OWNER_A,
    });
    expect((await notes(id))[0].body).toBe(
      'Personal note survives source expiry',
    );
    expect(await count('select count(*)::int count from hs.listings')).toBe(2);
  });

  it('applies narrower field, evidence, image and retention permissions at read time', async () => {
    const old = new Date(baseTime - 2 * 24 * HOUR).toISOString();
    const original = observation({
      coordinates: {
        longitude: 0,
        latitude: 0,
        precision: 'address',
        source: 'Synthetic coordinates',
        observedAt: old,
      },
      evidence: [
        {
          id: randomUUID(),
          kind: 'measurement',
          subject: 'nearby_nature',
          summary: 'Synthetic evidence',
          sourceUrl: `${ORIGIN}/home`,
          observedAt: old,
          datasetVersion: null,
          method: null,
          value: 100,
          unit: 'metres_straight_line',
        },
      ],
      photo: {
        url: `${ORIGIN}/photo`,
        attribution: 'Synthetic image',
        rightsBasis: 'Synthetic permission',
        observedAt: old,
        expiresAt: new Date(baseTime + 24 * HOUR).toISOString(),
        displayAllowed: true,
        hotlinkAllowed: true,
      },
    });
    await publishOne(original);
    expect((await snapshot()).listings[0]).toMatchObject({
      coordinates: original.coordinates,
      evidence: original.evidence,
      photo: original.photo,
    });
    const narrower = {
      ...policy('alpha'),
      retentionDays: 1,
      allowedFactFields: ['askingPriceSek'],
      allowedEvidenceSubjects: [],
      imageDisplay: false,
    };
    await db.query(
      'update hs.source_policies set policy=$1::jsonb where household_id=$2 and source_id=$3',
      [JSON.stringify(narrower), HOUSE_A, 'alpha'],
    );
    const item = (await snapshot()).listings[0];
    expect(item).toMatchObject({
      facts: { askingPriceSek: null, livingAreaM2: null, propertyType: null },
      coordinates: null,
      evidence: [],
      photo: null,
    });
  });
});

describe('historical replay and retention edges', () => {
  it('rejects contradictory fingerprints even when an unchanged refresh created no history row', async () => {
    await publishOne();
    const refreshedAt = new Date(baseTime + HOUR).toISOString();
    await publishOne(observation({ observedAt: refreshedAt }));
    await publishOne(
      observation({
        title: 'Later content',
        observedAt: new Date(baseTime + 2 * HOUR).toISOString(),
      }),
    );
    expect(await count('select count(*)::int count from hs.observations')).toBe(
      2,
    );
    const replay = beginRequest();
    await ingest(replay);
    await ingest(
      stageRequest(replay.runId, [
        observation({
          title: 'Contradictory refresh',
          observedAt: refreshedAt,
        }),
      ]),
    );
    await expect(ingest(publishRequest(replay.runId))).rejects.toThrow(
      'Conflicting published observation fingerprint',
    );
    expect((await snapshot()).listings[0].title).toBe('Later content');
  });

  it('hides old comparable prices and clears comparison when the current price conflicts', async () => {
    const original = observation({
      observedAt: new Date(baseTime - 2 * 24 * HOUR).toISOString(),
    });
    original.facts.askingPriceSek = 2_500_000;
    await publishOne(original);
    const current = observation({
      facts: { ...original.facts, askingPriceSek: 2_000_000 },
    });
    await publishOne(current);
    expect((await snapshot()).listings[0].previousAskingPriceSek).toBe(
      2_500_000,
    );
    await db.query(
      'update hs.source_policies set policy=$1::jsonb where household_id=$2 and source_id=$3',
      [
        JSON.stringify({ ...policy('alpha'), retentionDays: 1 }),
        HOUSE_A,
        'alpha',
      ],
    );
    expect((await snapshot()).listings[0]).toMatchObject({
      facts: { askingPriceSek: 2_000_000 },
      previousAskingPriceSek: null,
    });
    await publishOne(
      observation({
        observedAt: new Date(baseTime + HOUR).toISOString(),
        facts: { ...current.facts, askingPriceSek: 1_900_000 },
        conflicts: ['askingPriceSek'],
      }),
    );
    expect((await snapshot()).listings[0]).toMatchObject({
      conflicts: ['askingPriceSek'],
      previousAskingPriceSek: null,
    });
    expect(
      await count(
        'select count(*)::int count from hs.listings where previous_asking_price is not null',
      ),
    ).toBe(0);
  });

  it('keeps source-specific episodes separate and never compares prices between sources', async () => {
    const original = observation();
    await publishOne(
      observation({ facts: { ...original.facts, askingPriceSek: 2_500_000 } }),
      'alpha',
    );
    await publishOne(
      observation({ facts: { ...original.facts, askingPriceSek: 2_000_000 } }),
      'beta',
    );
    const listings = (await snapshot()).listings;
    expect(listings).toHaveLength(2);
    expect(listings.map((item) => item.previousAskingPriceSek)).toEqual([
      null,
      null,
    ]);
  });

  it('preserves a notes-only source bookmark after retention expiry alongside manual records', async () => {
    const old = new Date(baseTime - 2 * 24 * HOUR).toISOString();
    await publishOne(observation({ observedAt: old }));
    await publishOne(
      observation({
        sourceListingId: 'unsaved',
        sourceUrl: `${ORIGIN}/unsaved`,
        observedAt: old,
      }),
    );
    const source = (await snapshot()).listings.find(
      (item) => item.sourceUrls[0] === `${ORIGIN}/home`,
    );
    if (!source) throw new Error('Synthetic source listing missing');
    await saveNote(source.id, MEMBER_A, 'User-authored note', 0);
    const bookmark = await manual();
    await db.query(
      'update hs.source_policies set policy=$1::jsonb where household_id=$2 and source_id=$3',
      [
        JSON.stringify({ ...policy('alpha'), retentionDays: 1 }),
        HOUSE_A,
        'alpha',
      ],
    );
    const state = await snapshot();
    expect(state.listings).toHaveLength(2);
    expect(state.listings.find((item) => item.id === source.id)).toMatchObject({
      title: 'Saved listing: source facts unavailable',
      sourceUrls: [`${ORIGIN}/home`],
      coordinates: null,
      photo: null,
      evidence: [],
    });
    expect(
      state.listings.find((item) => item.id === bookmark.listingId)?.origin,
    ).toBe('manual');
    expect(state.favorites).toEqual([]);
    expect((await notes(source.id))[0].body).toBe('User-authored note');
  });

  it('rechecks revoked credentials and narrowed source scope after a run starts', async () => {
    const begin = beginRequest(randomUUID(), ['alpha', 'beta']);
    await ingest(begin);
    await db.query(
      "update hs.ingest_credentials set source_ids=array['alpha'] where key_id=$1",
      [KEY_A],
    );
    await expect(ingest(stageRequest(begin.runId))).rejects.toThrow(
      'Run unavailable',
    );
    await db.query(
      'update hs.ingest_credentials set revoked_at=now() where key_id=$1',
      [KEY_A],
    );
    await expect(
      ingest(publishRequest(begin.runId, ['alpha', 'beta'], 'failed')),
    ).rejects.toMatchObject({ code: '42501' });
    expect((await snapshot()).edition).toBeNull();
  });
});
