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

const DAY = 24 * HOUR;
const TABLES = [
  'households',
  'members',
  'profiles',
  'profile_versions',
  'source_policies',
  'ingest_credentials',
  'ingest_nonces',
  'runs',
  'batches',
  'staged_observations',
  'listings',
  'observations',
  'editions',
  'favorites',
  'notes',
] as const;
const purgeSchema = z.strictObject({
  observationsDeleted: z.number().int(),
  stagedDeleted: z.number().int(),
  listingsDeleted: z.number().int(),
  listingsTombstoned: z.number().int(),
  listingsScrubbed: z.number().int(),
  observationsScrubbed: z.number().int(),
  stagedScrubbed: z.number().int(),
  noncesDeleted: z.number().int(),
  cursorsReset: z.number().int(),
  more: z.boolean(),
});
type PurgeResult = z.infer<typeof purgeSchema>;
const NO_WORK: PurgeResult = {
  observationsDeleted: 0,
  stagedDeleted: 0,
  listingsDeleted: 0,
  listingsTombstoned: 0,
  listingsScrubbed: 0,
  observationsScrubbed: 0,
  stagedScrubbed: 0,
  noncesDeleted: 0,
  cursorsReset: 0,
  more: false,
};

function aged(days: number) {
  return new Date(baseTime - days * DAY).toISOString();
}

async function purge(
  options: { limit?: number; dryRun?: boolean; householdId?: string } = {},
) {
  const { limit = 100, dryRun = false, householdId = HOUSE_A } = options;
  return asRole('service_role', null, async () =>
    purgeSchema.parse(
      await rpc('select public.hs_purge_expired($1,$2,$3) as value', [
        householdId,
        limit,
        dryRun,
      ]),
    ),
  );
}

// A per-table md5 of every row, optionally limited to one household.
async function digest(
  tables: readonly string[] = TABLES,
  householdId?: string,
) {
  const result: Record<string, string> = {};
  for (const table of tables) {
    let filter = '';
    if (householdId)
      filter =
        table === 'ingest_nonces'
          ? 'where t.key_id in (select key_id from hs.ingest_credentials where household_id=$1)'
          : `where t.${table === 'households' ? 'id' : 'household_id'}=$1`;
    const row = await db.query<{ digest: string }>(
      `select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) digest from hs.${table} t ${filter}`,
      householdId ? [householdId] : [],
    );
    result[table] = row.rows[0].digest;
  }
  return result;
}

async function setPolicy(
  patch: Partial<SourcePolicy>,
  source = 'alpha',
  householdId = HOUSE_A,
) {
  await db.query(
    'update hs.source_policies set policy=$1::jsonb where household_id=$2 and source_id=$3',
    [JSON.stringify({ ...policy(source), ...patch }), householdId, source],
  );
}

async function lapse(source: string, householdId = HOUSE_A) {
  await db.query(
    "update hs.source_policies set policy=jsonb_set(policy,'{reviewDueAt}',to_jsonb((now()-interval '1 second')::text)) where household_id=$1 and source_id=$2",
    [householdId, source],
  );
}

async function listingByUrl(path: string) {
  const row = await db.query<{
    id: string;
    value: Record<string, unknown>;
    observed_at: Date;
    revision: number;
    last_checked_at: Date;
    previous_asking_price: number | null;
    previous_price_observed_at: Date | null;
  }>(
    'select id,value,observed_at,revision,last_checked_at,previous_asking_price,previous_price_observed_at from hs.listings where value->>$1=$2',
    ['sourceUrl', `${ORIGIN}/${path}`],
  );
  expect(row.rows).toHaveLength(1);
  return row.rows[0];
}

function stored(sql: string, params: string[] = []) {
  return db
    .query<{ value: unknown }>(sql, params)
    .then((result) => result.rows.map((row) => row.value));
}

function evidenceItem(
  subject: Observation['evidence'][number]['subject'],
  observedAt: string,
  sourceUrl: string | null = `${ORIGIN}/home`,
  kind: 'source_claim' | 'measurement' = 'source_claim',
): Observation['evidence'][number] {
  return {
    id: randomUUID(),
    kind,
    subject,
    summary: 'Synthetic evidence',
    sourceUrl,
    observedAt,
    datasetVersion: null,
    method: null,
    value: null,
    unit: null,
  };
}

function coordinateItem(
  observedAt: string,
): NonNullable<Observation['coordinates']> {
  return {
    longitude: 0,
    latitude: 0,
    precision: 'address',
    source: 'Synthetic coordinates',
    observedAt,
  };
}

function photoItem(
  observedAt: string,
  expiresAt = new Date(baseTime + DAY).toISOString(),
): NonNullable<Observation['photo']> {
  return {
    url: `${ORIGIN}/photo`,
    attribution: 'Synthetic image',
    rightsBasis: 'Synthetic permission',
    observedAt,
    expiresAt,
    displayAllowed: true,
    hotlinkAllowed: true,
  };
}

// Five listings in one published run. After retentionDays drops to 1 the first three
// are expired, the fourth has only stale nested data and the fifth is fully fresh.
const HOUSEHOLD_A = {
  id: HOUSE_A,
  key: KEY_A,
  profile: PROFILE_A,
  owner: OWNER_A,
  member: MEMBER_A,
};
const HOUSEHOLD_B = {
  id: HOUSE_B,
  key: KEY_B,
  profile: PROFILE_B,
  owner: OWNER_B,
  member: OWNER_B,
};

async function seedMixedState(household = HOUSEHOLD_A) {
  const begin = beginRequest(randomUUID(), ['alpha'], household.profile);
  await ingest(begin, household.key);
  const home = (id: string, overrides: Partial<Observation> = {}) =>
    observation({
      sourceListingId: id,
      sourceUrl: `${ORIGIN}/${id}`,
      title: id,
      ...overrides,
    });
  await ingest(
    stageRequest(begin.runId, [
      home('unsaved', { observedAt: aged(2) }),
      home('saved', { observedAt: aged(2) }),
      home('noted', { observedAt: aged(2) }),
      home('nested', {
        coordinates: coordinateItem(aged(2)),
        evidence: [evidenceItem('facts', aged(2), `${ORIGIN}/nested`)],
        photo: photoItem(aged(2)),
      }),
      home('fresh', {
        coordinates: coordinateItem(new Date(baseTime).toISOString()),
      }),
    ]),
    household.key,
  );
  await ingest(publishRequest(begin.runId), household.key);
  const state = await snapshot(household.id, household.owner);
  const idOf = (id: string) => {
    const found = state.listings.find((item) => item.title === id)?.id;
    if (!found) throw new Error(`Seeded listing ${id} missing`);
    return found;
  };
  await favorite(idOf('saved'), true, household.owner, household.id);
  await favorite(idOf('saved'), true, household.member, household.id);
  await saveNote(
    idOf('noted'),
    household.member,
    'Seeded note',
    0,
    household.id,
  );
  await db.query(
    "insert into hs.ingest_nonces(key_id,nonce,used_at) values($1,'seed_nonce_old_0001',now()-interval '61 minutes'),($1,'seed_nonce_new_0001',now()-interval '59 minutes')",
    [household.key],
  );
  await setPolicy({ retentionDays: 1 }, 'alpha', household.id);
  return { saved: idOf('saved'), noted: idOf('noted') };
}

// Three listings in one published run, returning their ids.
async function seedThree(overrides: Partial<Observation>) {
  const begin = beginRequest();
  await ingest(begin);
  await ingest(
    stageRequest(
      begin.runId,
      ['one', 'two', 'three'].map((id) =>
        observation({
          sourceListingId: id,
          sourceUrl: `${ORIGIN}/${id}`,
          title: id,
          ...overrides,
        }),
      ),
    ),
  );
  await ingest(publishRequest(begin.runId));
  const ids = (await snapshot()).listings.map((item) => item.id);
  expect(ids).toHaveLength(3);
  return ids;
}

const MIXED_TOTALS: PurgeResult = {
  observationsDeleted: 3,
  stagedDeleted: 3,
  listingsDeleted: 1,
  listingsTombstoned: 2,
  listingsScrubbed: 1,
  observationsScrubbed: 1,
  stagedScrubbed: 1,
  noncesDeleted: 1,
  cursorsReset: 0,
  more: false,
};

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
  for (const migration of [
    '202610120001_house_scanner.sql',
    '202610120002_house_scanner_retention.sql',
  ])
    await db.exec(
      await readFile(
        new URL(`../migrations/${migration}`, import.meta.url),
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
    expect(result.rows).toHaveLength(12);
    const serviceFunctions = [
      'hs_ingest_credential',
      'hs_consume_nonce',
      'hs_ingest_policies',
      'hs_ingest',
      'hs_purge_expired',
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

describe('bounded retention purge', () => {
  it('reports no work for an empty household and rejects malformed requests without a write', async () => {
    expect(await purge({ dryRun: true })).toEqual(NO_WORK);
    expect(await purge()).toEqual(NO_WORK);
    expect(await purge({ householdId: HOUSE_B })).toEqual(NO_WORK);
    const before = await digest();
    for (const limit of [0, -1, 1001])
      await expect(purge({ limit })).rejects.toThrow('Invalid purge request');
    await expect(purge({ householdId: randomUUID() })).rejects.toThrow(
      'Household unavailable',
    );
    expect(await digest()).toEqual(before);
  });

  it('purges one expired unsaved listing with its history and staged payload and keeps run records', async () => {
    await publishOne(observation({ observedAt: aged(2) }));
    await setPolicy({ retentionDays: 1 });
    const before = await snapshot();
    expect(before.listings).toEqual([]);
    const expected = {
      ...NO_WORK,
      observationsDeleted: 1,
      stagedDeleted: 1,
      listingsDeleted: 1,
    };
    expect(await purge({ dryRun: true })).toEqual(expected);
    expect(await count('select count(*)::int count from hs.listings')).toBe(1);
    expect(await purge()).toEqual(expected);
    for (const table of ['listings', 'observations', 'staged_observations'])
      expect(await count(`select count(*)::int count from hs.${table}`)).toBe(
        0,
      );
    for (const table of ['runs', 'batches', 'editions'])
      expect(await count(`select count(*)::int count from hs.${table}`)).toBe(
        1,
      );
    expect(await snapshot()).toEqual(before);
    expect(
      await stored(
        "select cursor value from hs.source_policies where household_id=$1 and source_id='alpha'",
        [HOUSE_A],
      ),
    ).toEqual(['cursor-alpha']);
  });

  it('purges source rows once their origin leaves the policy', async () => {
    await publishOne();
    await setPolicy({ listingOrigins: ['https://other.invalid'] });
    expect((await snapshot()).listings).toEqual([]);
    expect(await purge()).toEqual({
      ...NO_WORK,
      observationsDeleted: 1,
      stagedDeleted: 1,
      listingsDeleted: 1,
    });
    expect(await count('select count(*)::int count from hs.listings')).toBe(0);
  });

  it('reports the same counts in a dry run as in the first real run and changes nothing', async () => {
    await seedMixedState();
    const before = await digest();
    const defaulted = await asRole('service_role', null, async () =>
      purgeSchema.parse(
        await rpc('select public.hs_purge_expired($1,$2) as value', [
          HOUSE_A,
          100,
        ]),
      ),
    );
    expect(defaulted).toEqual(MIXED_TOTALS);
    const nulled = await asRole('service_role', null, async () =>
      purgeSchema.parse(
        await rpc('select public.hs_purge_expired($1,$2,null) as value', [
          HOUSE_A,
          100,
        ]),
      ),
    );
    expect(nulled).toEqual(MIXED_TOTALS);
    expect(await purge({ dryRun: true })).toEqual(MIXED_TOTALS);
    expect(await digest()).toEqual(before);
    expect(await purge()).toEqual(MIXED_TOTALS);
    expect(await digest()).not.toEqual(before);
  });

  it('converges across bounded calls and matches a single unbounded pass', async () => {
    await seedMixedState();
    const totals = { ...NO_WORK, more: undefined } as Record<
      string,
      number | boolean | undefined
    >;
    delete totals.more;
    let calls = 0;
    for (;;) {
      const { more, ...counts } = await purge({ limit: 2 });
      calls += 1;
      expect(
        Object.values(counts).reduce((sum, value) => sum + value, 0),
      ).toBeLessThanOrEqual(2);
      for (const [key, value] of Object.entries(counts))
        totals[key] = Number(totals[key]) + value;
      if (!more) break;
      expect(calls).toBeLessThan(20);
    }
    expect(calls).toBeGreaterThan(3);
    expect({ ...totals, more: false }).toEqual(MIXED_TOTALS);
    const settled = await digest();
    expect(await purge({ limit: 2 })).toEqual(NO_WORK);
    expect(await digest()).toEqual(settled);
  });

  it('removes hidden nested coordinates, evidence, photo, facts and previous price and leaves snapshots unchanged', async () => {
    const original = observation();
    await publishOne(
      observation({
        observedAt: aged(2),
        facts: { ...original.facts, askingPriceSek: 2_500_000 },
      }),
    );
    await setPolicy({ listingOrigins: [ORIGIN, 'https://other.invalid'] });
    const fresh = new Date(baseTime).toISOString();
    const keptClaim = evidenceItem('facts', fresh);
    const keptMeasurement = evidenceItem('facts', fresh, null, 'measurement');
    await publishOne(
      observation({
        facts: { ...original.facts, askingPriceSek: 2_000_000 },
        coordinates: coordinateItem(aged(2)),
        photo: photoItem(aged(2)),
        evidence: [
          keptClaim,
          evidenceItem('facts', aged(2)),
          evidenceItem('nearby_nature', fresh),
          evidenceItem('facts', fresh, 'https://other.invalid/x'),
          keptMeasurement,
        ],
      }),
    );
    await setPolicy({
      retentionDays: 1,
      allowedFactFields: ['askingPriceSek', 'rooms'],
      allowedEvidenceSubjects: ['facts'],
    });
    const before = await snapshot();
    expect(before.listings[0]).toMatchObject({
      coordinates: null,
      photo: null,
      previousAskingPriceSek: null,
      facts: { askingPriceSek: 2_000_000, rooms: 2, livingAreaM2: null },
    });
    expect(before.listings[0].evidence.map((item) => item.id)).toEqual([
      keptClaim.id,
      keptMeasurement.id,
    ]);
    const row = await listingByUrl('home');
    expect(row.value.evidence).toHaveLength(5);
    expect(row.value.coordinates).not.toBeNull();
    expect(row.previous_asking_price).toBe(2_500_000);
    expect(await purge()).toEqual({
      ...NO_WORK,
      observationsDeleted: 1,
      stagedDeleted: 1,
      listingsScrubbed: 1,
      observationsScrubbed: 1,
      stagedScrubbed: 1,
    });
    expect(await snapshot()).toEqual(before);
    const after = await listingByUrl('home');
    expect(after).toMatchObject({
      id: row.id,
      revision: row.revision,
      previous_asking_price: null,
      previous_price_observed_at: null,
    });
    expect(after.observed_at).toEqual(row.observed_at);
    expect(after.last_checked_at).toEqual(row.last_checked_at);
    expect(after.value).toMatchObject({
      title: 'Synthetic home',
      sourceUrl: `${ORIGIN}/home`,
      conflicts: [],
      coordinates: null,
      photo: null,
      facts: {
        ...Object.fromEntries(
          Object.keys(original.facts).map((key) => [key, null]),
        ),
        tenure: 'unknown',
        status: 'unknown',
        askingPriceSek: 2_000_000,
        rooms: 2,
      },
    });
    expect(
      (after.value.evidence as { id: string }[]).map((item) => item.id),
    ).toEqual([keptClaim.id, keptMeasurement.id]);
    for (const table of ['observations', 'staged_observations'])
      expect(await stored(`select value from hs.${table}`)).toEqual([
        after.value,
      ]);
    expect(await purge()).toEqual(NO_WORK);
  });

  it('clears the previous price when the policy stops allowing asking prices', async () => {
    const original = observation();
    await publishOne(
      observation({
        observedAt: new Date(baseTime - HOUR).toISOString(),
        facts: { ...original.facts, askingPriceSek: 2_500_000 },
      }),
    );
    await publishOne(
      observation({ facts: { ...original.facts, askingPriceSek: 2_000_000 } }),
    );
    expect((await snapshot()).listings[0].previousAskingPriceSek).toBe(
      2_500_000,
    );
    await setPolicy({
      allowedFactFields: Object.keys(original.facts).filter(
        (key) => key !== 'askingPriceSek',
      ) as SourcePolicy['allowedFactFields'],
    });
    const hidden = await snapshot();
    expect(hidden.listings[0].previousAskingPriceSek).toBeNull();
    expect(await purge()).toMatchObject({
      listingsScrubbed: 1,
      observationsScrubbed: 2,
      stagedScrubbed: 2,
    });
    expect(await snapshot()).toEqual(hidden);
    expect(
      await count(
        'select count(*)::int count from hs.listings where previous_asking_price is not null or previous_price_observed_at is not null',
      ),
    ).toBe(0);
    expect(
      await stored(
        "select value->'facts'->'askingPriceSek' value from hs.listings",
      ),
    ).toEqual([null]);
  });

  it.each<[string, Partial<SourcePolicy> | null]>([
    ['image display is off', { imageDisplay: false }],
    ['image hotlinking is off', { imageHotlink: false }],
    ['the image origin is no longer approved', { imageOrigins: [] }],
    ['the photo observation is outside retention', { retentionDays: 1 }],
    ['the photo has expired', null],
  ])('drops the stored photo when %s', async (_name, patch) => {
    const observedAt =
      patch && 'retentionDays' in patch
        ? aged(2)
        : new Date(baseTime).toISOString();
    await publishOne(observation({ photo: photoItem(observedAt) }));
    if (patch) await setPolicy(patch);
    else
      await db.query(
        "update hs.listings set value=jsonb_set(value,'{photo,expiresAt}',to_jsonb($1::text))",
        [new Date(Date.now() - HOUR).toISOString()],
      );
    const before = await snapshot();
    expect(before.listings[0].photo).toBeNull();
    expect((await listingByUrl('home')).value.photo).not.toBeNull();
    expect(await purge()).toMatchObject({
      listingsScrubbed: 1,
      listingsDeleted: 0,
    });
    expect((await listingByUrl('home')).value.photo).toBeNull();
    expect(await snapshot()).toEqual(before);
    expect(await purge()).toEqual(NO_WORK);
  });

  it('leaves fresh nested data and previous prices byte-identical', async () => {
    const original = observation();
    const fresh = new Date(baseTime).toISOString();
    await publishOne(
      observation({
        observedAt: new Date(baseTime - HOUR).toISOString(),
        facts: { ...original.facts, askingPriceSek: 2_500_000 },
      }),
    );
    await publishOne(
      observation({
        facts: { ...original.facts, askingPriceSek: 2_000_000 },
        coordinates: coordinateItem(fresh),
        photo: photoItem(fresh),
        evidence: [evidenceItem('facts', fresh)],
      }),
    );
    const before = await digest();
    const snapshotBefore = await snapshot();
    expect(snapshotBefore.listings[0]).toMatchObject({
      previousAskingPriceSek: 2_500_000,
    });
    expect(snapshotBefore.listings[0].coordinates).not.toBeNull();
    expect(snapshotBefore.listings[0].photo).not.toBeNull();
    const valuesSql =
      'select value::text value from hs.listings union all select value::text from hs.observations union all select value::text from hs.staged_observations';
    const text = await stored(valuesSql);
    expect(await purge()).toEqual(NO_WORK);
    expect(await stored(valuesSql)).toEqual(text);
    expect(await digest()).toEqual(before);
    expect(await snapshot()).toEqual(snapshotBefore);
  });

  it('uses each source policy at purge time, resets cursors only for lapsed sources and keeps saved records', async () => {
    await db.query(
      "insert into hs.source_policies(household_id,source_id,policy,cursor) values($1,'gamma',$2::jsonb,'previous-cursor')",
      [HOUSE_A, JSON.stringify(policy('gamma'))],
    );
    await db.query(
      "update hs.ingest_credentials set source_ids=array['alpha','beta','gamma'] where key_id=$1",
      [KEY_A],
    );
    await publishOne(
      observation({ sourceListingId: 'alpha-home', observedAt: aged(2) }),
      'alpha',
    );
    await publishOne(
      observation({ sourceListingId: 'beta-home', observedAt: aged(2) }),
      'beta',
    );
    await publishOne(
      observation({
        sourceListingId: 'gamma-unsaved',
        sourceUrl: `${ORIGIN}/gamma-unsaved`,
      }),
      'gamma',
    );
    await publishOne(
      observation({
        sourceListingId: 'gamma-saved',
        sourceUrl: `${ORIGIN}/gamma-saved`,
      }),
      'gamma',
    );
    const staging = beginRequest(randomUUID(), ['gamma']);
    await ingest(staging);
    await ingest(
      stageRequest(
        staging.runId,
        [observation({ sourceListingId: 'gamma-open' })],
        'gamma',
      ),
    );
    const saved = (await snapshot()).listings.find(
      (item) => item.sourceUrls[0] === `${ORIGIN}/gamma-saved`,
    );
    if (!saved) throw new Error('Synthetic gamma listing missing');
    await favorite(saved.id, true);
    await setPolicy({ retentionDays: 1 }, 'alpha');
    await lapse('gamma');
    const betaRows = () =>
      stored(
        "select jsonb_build_object('l',(select jsonb_agg(to_jsonb(l)) from hs.listings l where source_id='beta'),'o',(select jsonb_agg(to_jsonb(o)) from hs.observations o join hs.listings l on l.id=o.listing_id where l.source_id='beta'),'s',(select jsonb_agg(to_jsonb(s)) from hs.staged_observations s where source_id='beta')) value",
      );
    const betaBefore = await betaRows();
    const before = await snapshot();
    expect(before.listings.map((item) => item.sourceUrls[0]).sort()).toEqual([
      `${ORIGIN}/gamma-saved`,
      `${ORIGIN}/home`,
    ]);
    expect(await purge()).toEqual({
      ...NO_WORK,
      observationsDeleted: 3,
      stagedDeleted: 4,
      listingsDeleted: 2,
      listingsTombstoned: 1,
      cursorsReset: 1,
    });
    expect(await snapshot()).toEqual(before);
    expect(await betaRows()).toEqual(betaBefore);
    const cursors = await db.query<{
      source_id: string;
      cursor: string | null;
    }>(
      'select source_id,cursor from hs.source_policies where household_id=$1 order by source_id',
      [HOUSE_A],
    );
    expect(cursors.rows).toEqual([
      { source_id: 'alpha', cursor: 'cursor-alpha' },
      { source_id: 'beta', cursor: 'cursor-beta' },
      { source_id: 'gamma', cursor: null },
    ]);
    expect(await purge()).toEqual(NO_WORK);
  });

  it('turns an expired saved or noted listing into a tombstone and keeps every user record', async () => {
    const { saved, noted } = await seedMixedState();
    const userTables = ['favorites', 'notes', 'members'];
    const userRecords = await digest(userTables);
    const identity = () =>
      db
        .query(
          'select id,source_id,source_listing_id,episode_id,canonical_url,revision,last_checked_at from hs.listings where id in ($1,$2) order by id',
          [saved, noted],
        )
        .then((result) => result.rows);
    const rows = await identity();
    expect(rows).toHaveLength(2);
    const before = await snapshot();
    const placeholders = before.listings.filter((item) =>
      [saved, noted].includes(item.id),
    );
    expect(placeholders).toHaveLength(2);
    for (const item of placeholders)
      expect(item.title).toBe('Saved listing: source facts unavailable');
    expect(await purge()).toEqual(MIXED_TOTALS);
    expect(await digest(userTables)).toEqual(userRecords);
    expect(await identity()).toEqual(rows);
    const tombstones = await db.query<{
      value: unknown;
      observed_at: Date;
      previous_asking_price: number | null;
      previous_price_observed_at: Date | null;
      history: number;
      staged: number;
    }>(
      `select value,observed_at,previous_asking_price,previous_price_observed_at,
        (select count(*)::int from hs.observations o where o.listing_id=l.id) history,
        (select count(*)::int from hs.staged_observations s where s.source_listing_id=l.source_listing_id) staged
       from hs.listings l where id in ($1,$2) order by value->>'sourceUrl'`,
      [saved, noted],
    );
    expect(tombstones.rows.map((row) => row.value)).toEqual([
      { sourceUrl: `${ORIGIN}/noted` },
      { sourceUrl: `${ORIGIN}/saved` },
    ]);
    for (const row of tombstones.rows)
      expect(row).toMatchObject({
        observed_at: new Date(0),
        previous_asking_price: null,
        previous_price_observed_at: null,
        history: 0,
        staged: 0,
      });
    const state = await snapshot();
    expect(state).toEqual(before);
    expect(state.favorites.map((item) => item.listingId)).toEqual([
      saved,
      saved,
    ]);
    expect((await notes(noted))[0].body).toBe('Seeded note');
    expect(
      await stored(
        'select bookmark_url value from hs.favorites union all select bookmark_url from hs.notes order by 1',
      ),
    ).toEqual([`${ORIGIN}/noted`, `${ORIGIN}/saved`, `${ORIGIN}/saved`]);
  });

  it('rehydrates a tombstone on re-observation without a conflict and keeps its saves', async () => {
    const { saved } = await seedMixedState();
    await purge();
    const tombstone = await listingByUrl('saved');
    await publishOne(
      observation({
        sourceListingId: 'saved',
        sourceUrl: `${ORIGIN}/saved`,
        title: 'Returned listing',
      }),
    );
    const row = await listingByUrl('saved');
    expect(row).toMatchObject({ id: saved, revision: tombstone.revision + 1 });
    expect(row.observed_at.getTime()).toBe(baseTime);
    const state = await snapshot();
    expect(state.listings.find((item) => item.id === saved)).toMatchObject({
      title: 'Returned listing',
      facts: { livingAreaM2: 60 },
    });
    expect(
      state.favorites.filter((item) => item.listingId === saved),
    ).toHaveLength(2);
    expect(
      await count(
        'select count(*)::int count from hs.observations where listing_id=$1',
        [saved],
      ),
    ).toBe(1);
    expect(await purge()).toEqual(NO_WORK);
  });

  it('deletes a tombstone once its last favorite and note are gone', async () => {
    await publishOne(observation({ observedAt: aged(2) }));
    const id = (await snapshot()).listings[0].id;
    await favorite(id, true);
    await setPolicy({ retentionDays: 1 });
    expect(await purge()).toMatchObject({
      listingsTombstoned: 1,
      listingsDeleted: 0,
    });
    expect(await purge()).toEqual(NO_WORK);
    await favorite(id, false);
    expect(await purge()).toEqual({ ...NO_WORK, listingsDeleted: 1 });
    expect(await count('select count(*)::int count from hs.listings')).toBe(0);
  });

  it('deletes staging-run payloads that would need scrubbing and scrubs closed-run payloads in place', async () => {
    const stale = {
      coordinates: coordinateItem(aged(2)),
      evidence: [evidenceItem('facts', aged(2))],
    };
    await publishOne(
      observation({
        sourceListingId: 'closed',
        sourceUrl: `${ORIGIN}/closed`,
        ...stale,
      }),
    );
    const open = beginRequest();
    await ingest(open);
    const stage = stageRequest(open.runId, [
      observation({
        sourceListingId: 'open',
        sourceUrl: `${ORIGIN}/open`,
        ...stale,
      }),
    ]);
    await ingest(stage);
    await setPolicy({ retentionDays: 1 });
    const expected = {
      ...NO_WORK,
      stagedDeleted: 1,
      stagedScrubbed: 1,
      observationsScrubbed: 1,
      listingsScrubbed: 1,
    };
    expect(await purge({ dryRun: true })).toEqual(expected);
    expect(await purge()).toEqual(expected);
    expect(
      await stored(
        "select jsonb_build_object('url',value->>'sourceUrl','coordinates',value->'coordinates','evidence',value->'evidence') value from hs.staged_observations",
      ),
    ).toEqual([{ url: `${ORIGIN}/closed`, coordinates: null, evidence: [] }]);
    expect((await ingest(stage)).state).toBe('staging');
    await expect(ingest(publishRequest(open.runId))).rejects.toThrow(
      'Empty results lack coverage proof',
    );
  });

  it('is a no-op on a second run with an equal state digest', async () => {
    await seedMixedState();
    expect(await purge()).toEqual(MIXED_TOTALS);
    const settled = await digest();
    expect(await purge()).toEqual(NO_WORK);
    expect(await purge({ dryRun: true })).toEqual(NO_WORK);
    expect(await digest()).toEqual(settled);
  });

  it('rolls the whole call back when a write fails and succeeds on a rerun', async () => {
    await seedMixedState();
    const before = await digest();
    await db.exec(`
      create function hs.test_fail_listing_write() returns trigger language plpgsql as $$ begin raise exception 'Synthetic listing write failure'; end $$;
      create trigger test_fail_listing_write before update or delete on hs.listings for each row execute function hs.test_fail_listing_write();
    `);
    try {
      await expect(purge()).rejects.toThrow('Synthetic listing write failure');
      expect(await digest()).toEqual(before);
      expect(
        await count('select count(*)::int count from hs.observations'),
      ).toBe(5);
    } finally {
      await db.exec(
        'drop trigger test_fail_listing_write on hs.listings; drop function hs.test_fail_listing_write()',
      );
    }
    expect(await purge()).toEqual(MIXED_TOTALS);
    expect(await count('select count(*)::int count from hs.observations')).toBe(
      2,
    );
  });

  it('keeps replay protection: live nonces stay, old nonces go, stale timestamps stay rejected', async () => {
    const consume = (
      nonce: string,
      timestamp = Math.floor(Date.now() / 1000),
      key = KEY_A,
    ) =>
      asRole('service_role', null, () =>
        rpc('select public.hs_consume_nonce($1,$2,$3) as value', [
          key,
          nonce,
          timestamp,
        ]),
      );
    await consume('live_nonce_000001');
    await consume('hour_nonce_000001');
    await consume('older_nonce_00001');
    await consume('other_house_nonce', undefined, KEY_B);
    await db.query(
      "update hs.ingest_nonces set used_at=now()-interval '59 minutes' where nonce='hour_nonce_000001'",
    );
    await db.query(
      "update hs.ingest_nonces set used_at=now()-interval '61 minutes' where nonce in ('older_nonce_00001','other_house_nonce')",
    );
    expect(await purge({ dryRun: true })).toEqual({
      ...NO_WORK,
      noncesDeleted: 1,
    });
    expect(await purge()).toEqual({ ...NO_WORK, noncesDeleted: 1 });
    expect(
      await stored('select nonce value from hs.ingest_nonces order by nonce'),
    ).toEqual(['hour_nonce_000001', 'live_nonce_000001', 'other_house_nonce']);
    await expect(consume('live_nonce_000001')).rejects.toMatchObject({
      code: '23505',
    });
    await expect(
      consume('older_nonce_00001', Math.floor(Date.now() / 1000) - 3700),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      consume('older_nonce_00001', Math.floor(Date.now() / 1000) - 301),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('returns identical run, batch and publish replays after the payload is purged', async () => {
    const begin = beginRequest();
    const stage = stageRequest(begin.runId, [
      observation({ observedAt: aged(2) }),
    ]);
    const publish = publishRequest(begin.runId);
    await ingest(begin);
    await ingest(stage);
    const published = await ingest(publish);
    const replays = [
      await ingest(begin),
      await ingest(stage),
      await ingest(publish),
    ];
    expect(published.state).toBe('published');
    await setPolicy({ retentionDays: 1 });
    expect(await purge()).toMatchObject({ stagedDeleted: 1 });
    expect(
      await count('select count(*)::int count from hs.staged_observations'),
    ).toBe(0);
    expect([
      await ingest(begin),
      await ingest(stage),
      await ingest(publish),
    ]).toEqual(replays);
    for (const [table, expected] of [
      ['staged_observations', 0],
      ['observations', 0],
      ['listings', 0],
      ['batches', 1],
      ['runs', 1],
      ['editions', 1],
    ] as const)
      expect(await count(`select count(*)::int count from hs.${table}`)).toBe(
        expected,
      );
  });

  it('never touches a manual listing, however old its observed_at', async () => {
    const bookmark = await manual(
      HOUSE_A,
      OWNER_A,
      `${ORIGIN}/old`,
      'Old note',
    );
    await favorite(bookmark.listingId, true);
    await db.query(
      "update hs.listings set observed_at=now()-interval '400 days' where id=$1",
      [bookmark.listingId],
    );
    await publishOne(observation({ observedAt: aged(2) }));
    await setPolicy({ retentionDays: 1 });
    const userRecords = await digest(['favorites', 'notes']);
    const read = () =>
      db
        .query('select * from hs.listings where id=$1', [bookmark.listingId])
        .then((result) => result.rows);
    const row = await read();
    expect(row).toHaveLength(1);
    expect(await purge()).toMatchObject({ listingsDeleted: 1 });
    expect(await read()).toEqual(row);
    expect(await digest(['favorites', 'notes'])).toEqual(userRecords);
    expect((await snapshot()).listings.map((item) => item.id)).toEqual([
      bookmark.listingId,
    ]);
  });

  it('never touches another household, including its lapsed cursors and old nonces', async () => {
    await seedMixedState();
    await seedMixedState(HOUSEHOLD_B);
    await lapse('beta', HOUSE_B);
    const houseB = await digest(TABLES, HOUSE_B);
    expect(await purge()).toEqual(MIXED_TOTALS);
    expect(await digest(TABLES, HOUSE_B)).toEqual(houseB);
    expect(
      await stored(
        "select cursor value from hs.source_policies where household_id=$1 and source_id='beta'",
        [HOUSE_B],
      ),
    ).toEqual(['previous-cursor']);
    expect(await purge({ householdId: HOUSE_B })).toEqual({
      ...MIXED_TOTALS,
      cursorsReset: 1,
    });
  });

  it('nulls coordinates dated beyond the clock skew allowance', async () => {
    await publishOne(
      observation({
        coordinates: coordinateItem(new Date(baseTime).toISOString()),
      }),
    );
    await db.query(
      "update hs.listings set value=jsonb_set(value,'{coordinates,observedAt}',to_jsonb($1::text))",
      [new Date(Date.now() + HOUR).toISOString()],
    );
    const before = await snapshot();
    expect(before.listings[0].coordinates).toBeNull();
    expect(await purge()).toMatchObject({ listingsScrubbed: 1 });
    expect((await listingByUrl('home')).value.coordinates).toBeNull();
    expect(await snapshot()).toEqual(before);
  });

  it('clears the previous price when an expired saved listing becomes a tombstone', async () => {
    const original = observation();
    await publishOne(
      observation({
        observedAt: aged(3),
        facts: { ...original.facts, askingPriceSek: 2_500_000 },
      }),
    );
    await publishOne(
      observation({
        observedAt: aged(2),
        facts: { ...original.facts, askingPriceSek: 2_000_000 },
      }),
    );
    const id = (await snapshot()).listings[0].id;
    await favorite(id, true);
    expect((await listingByUrl('home')).previous_asking_price).toBe(2_500_000);
    await setPolicy({ retentionDays: 1 });
    expect(await purge()).toEqual({
      ...NO_WORK,
      observationsDeleted: 2,
      stagedDeleted: 2,
      listingsTombstoned: 1,
    });
    expect(await listingByUrl('home')).toMatchObject({
      previous_asking_price: null,
      previous_price_observed_at: null,
    });
  });

  it('deletes all history of a listing that is no longer live even when each row is individually live', async () => {
    await publishOne(
      observation({ observedAt: new Date(baseTime - HOUR).toISOString() }),
    );
    await publishOne(observation({ title: 'Newer title' }));
    expect(await count('select count(*)::int count from hs.observations')).toBe(
      2,
    );
    await db.query(
      "update hs.listings set value=jsonb_set(value,'{sourceUrl}','\"https://other.invalid/x\"')",
    );
    expect((await snapshot()).listings).toEqual([]);
    expect(await purge()).toEqual({
      ...NO_WORK,
      observationsDeleted: 2,
      listingsDeleted: 1,
    });
    expect(await count('select count(*)::int count from hs.listings')).toBe(0);
  });

  it.each([
    [
      'listingsDeleted',
      async () => {
        await seedThree({ observedAt: aged(2) });
        await setPolicy({ retentionDays: 1 });
        await db.exec(
          'delete from hs.observations; delete from hs.staged_observations',
        );
      },
    ],
    [
      'listingsTombstoned',
      async () => {
        for (const id of await seedThree({ observedAt: aged(2) }))
          await favorite(id, true);
        await setPolicy({ retentionDays: 1 });
        await db.exec(
          'delete from hs.observations; delete from hs.staged_observations',
        );
      },
    ],
    [
      'listingsScrubbed',
      async () => {
        await seedThree({ coordinates: coordinateItem(aged(2)) });
        await setPolicy({ retentionDays: 1 });
        await db.exec(
          'delete from hs.observations; delete from hs.staged_observations',
        );
      },
    ],
    [
      'observationsDeleted',
      async () => {
        // Tombstones remain after their history goes, so this class is the only work left.
        for (const id of await seedThree({ observedAt: aged(2) }))
          await favorite(id, true);
        await setPolicy({ retentionDays: 1 });
        await db.exec('delete from hs.staged_observations');
        await purge();
        await db.query(
          "insert into hs.observations(household_id,listing_id,run_id,value) select l.household_id,l.id,(select id from hs.runs limit 1),jsonb_build_object('sourceUrl',l.value->>'sourceUrl','observedAt',$1::text) from hs.listings l",
          [aged(2)],
        );
      },
    ],
    [
      'observationsScrubbed',
      async () => {
        await seedThree({ coordinates: coordinateItem(aged(2)) });
        await setPolicy({ retentionDays: 1 });
        await db.exec(
          "update hs.listings set value=jsonb_set(value,'{coordinates}','null'::jsonb); delete from hs.staged_observations",
        );
      },
    ],
    [
      'stagedDeleted',
      async () => {
        await seedThree({ observedAt: aged(2) });
        await setPolicy({ retentionDays: 1 });
        await db.exec('delete from hs.observations; delete from hs.listings');
      },
    ],
    [
      'stagedScrubbed',
      async () => {
        await seedThree({ coordinates: coordinateItem(aged(2)) });
        await setPolicy({ retentionDays: 1 });
        await db.exec(
          "update hs.listings set value=jsonb_set(value,'{coordinates}','null'::jsonb); update hs.observations set value=jsonb_set(value,'{coordinates}','null'::jsonb)",
        );
      },
    ],
    [
      'noncesDeleted',
      async () => {
        for (const nonce of [
          'old_nonce_0000001',
          'old_nonce_0000002',
          'old_nonce_0000003',
        ])
          await db.query(
            "insert into hs.ingest_nonces(key_id,nonce,used_at) values($1,$2,now()-interval '2 hours')",
            [KEY_A, nonce],
          );
      },
    ],
    [
      'cursorsReset',
      async () => {
        for (const id of ['lapsed-one', 'lapsed-two', 'lapsed-three'])
          await db.query(
            "insert into hs.source_policies(household_id,source_id,policy,cursor) values($1,$2,$3::jsonb,'stale')",
            [
              HOUSE_A,
              id,
              JSON.stringify({
                ...policy(id),
                reviewDueAt: new Date(baseTime - HOUR / 2).toISOString(),
              }),
            ],
          );
      },
    ],
  ] as const)(
    'reports more and converges when %s exceeds the call budget',
    async (key, arrange) => {
      await arrange();
      const first = await purge({ limit: 2 });
      expect(first).toMatchObject({ [key]: 2, more: true });
      for (let call = 0; call < 10; call += 1)
        if (!(await purge({ limit: 2 })).more) break;
      expect(await purge({ limit: 2 })).toEqual(NO_WORK);
    },
  );

  it('lets only the service role execute the purge', async () => {
    const privileges = await db.query<{
      anon: boolean;
      browser: boolean;
      service: boolean;
      private_service: boolean;
    }>(`
      select has_function_privilege('anon',p.oid,'EXECUTE') anon,
        has_function_privilege('authenticated',p.oid,'EXECUTE') browser,
        has_function_privilege('service_role',p.oid,'EXECUTE') service,
        has_function_privilege('service_role','hs.purge_expired(uuid,integer,boolean)','EXECUTE') private_service
      from pg_proc p where p.oid='public.hs_purge_expired(uuid,integer,boolean)'::regprocedure
    `);
    expect(privileges.rows).toEqual([
      { anon: false, browser: false, service: true, private_service: false },
    ]);
    const call = [HOUSE_A, 10, false];
    await expect(
      asRole('authenticated', OWNER_A, () =>
        rpc('select public.hs_purge_expired($1,$2,$3) as value', call),
      ),
    ).rejects.toThrow('permission denied for function hs_purge_expired');
    await expect(
      asRole('anon', null, () =>
        rpc('select public.hs_purge_expired($1,$2,$3) as value', call),
      ),
    ).rejects.toThrow('permission denied for function hs_purge_expired');
    await expect(
      asRole('service_role', null, () =>
        rpc('select hs.purge_expired($1,$2,$3) as value', call),
      ),
    ).rejects.toThrow('permission denied for schema hs');
    const tables = await db.query<{ granted: boolean }>(`
      select has_table_privilege(r,c.oid,'SELECT,INSERT,UPDATE,DELETE') granted
      from pg_class c join pg_namespace n on n.oid=c.relnamespace,unnest(array['anon','authenticated','service_role']) r
      where n.nspname='hs' and c.relkind='r'
    `);
    expect(tables.rows).toHaveLength(45);
    expect(tables.rows.every((row) => !row.granted)).toBe(true);
  });
});
