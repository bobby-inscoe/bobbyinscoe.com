import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  defaultLiveDeps,
  type LiveDeps,
  type LiveEvent,
  parseRobots,
  partitionUrl,
  prepareLiveRun,
  robotsAllows,
  runBoneoCollection,
  USER_AGENT,
} from '@house-scanner-tools/boneo-live';

import { planQueries } from '@house-scanner-tools/query-plan';
import { sourceRegistry } from '@house-scanner-tools/source-registry';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SYNTHETIC_SNAPSHOT } from '@/features/house-scanner/mock/synthetic-household';
import { assertSourceAllowed } from '@/features/house-scanner/utils/source-policy';

const fixture = (name: string) =>
  readFileSync(resolve('tools/house-scanner/fixtures/boneo', name), 'utf8');
const ROBOTS = fixture('robots.txt');
const goteborg = [
  {
    id: 'municipality-1',
    municipality: 'Göteborg',
    propertyTypes: ['apartment' as const],
  },
];

function nextPage(ids: number[], count: number) {
  const items = ids.map((id) => ({
    property_id: id,
    slug: `https://www.boneo.se/bostad/fixture-${id}`,
    title_field: `Fixturegatan ${id}`,
    created_date: '2026-09-30T08:00:00.000Z',
    field_status_id: 'Till salu',
    is_active: true,
    field_property_price: 3_000_000,
  }));
  return `<script id="__NEXT_DATA__">${JSON.stringify({
    props: { pageProps: { listData: { pData: items, count } } },
  })}</script>`;
}

type Reply = { status?: number; body?: string; type?: string } | Error;
function fakeFetch(handler: (url: string, call: number) => Reply) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = vi.fn(
    async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init: init ?? {} });
      const reply = handler(url, calls.length);
      if (reply instanceof Error) throw reply;
      return new Response(reply.body ?? '', {
        status: reply.status ?? 200,
        headers: { 'content-type': reply.type ?? 'text/html; charset=utf-8' },
      });
    },
  );
  return { impl: impl as unknown as typeof fetch, calls, spy: impl };
}
function deps(fetchImpl: typeof fetch, events: LiveEvent[] = []): LiveDeps {
  let clock = 0;
  return {
    fetch: fetchImpl,
    now: () => 1_760_000_000_000 + clock,
    sleep: async (ms) => {
      clock += ms;
    },
    log: (event) => events.push(event),
  };
}
const robotsOr =
  (page: (url: string, n: number) => Reply) =>
  (url: string, n: number): Reply =>
    url.endsWith('/robots.txt')
      ? { body: ROBOTS, type: 'text/plain' }
      : page(url, n);

afterEach(() => vi.useRealTimers());

describe('robots rules', () => {
  it('applies the longest match and lets allow win ties', () => {
    const rules = parseRobots(
      'User-agent: *\nDisallow: /sv/\nAllow: /sv/till_salu/\nDisallow: /*.json$\n',
    );
    expect(robotsAllows(rules, '/sv/till_salu/x')).toBe(true);
    expect(robotsAllows(rules, '/sv/andra')).toBe(false);
    expect(robotsAllows(rules, '/data.json')).toBe(false);
    expect(robotsAllows(rules, '/data.json?x=1')).toBe(true);
  });

  it('prefers a group naming this reader over the wildcard group', () => {
    const rules = parseRobots(
      'User-agent: *\nAllow: /\n\nUser-agent: HouseScannerPersonalReader\nDisallow: /sv/\n',
    );
    expect(robotsAllows(rules, '/sv/till_salu')).toBe(false);
  });

  it('allows the partition path and rejects unknown municipalities', () => {
    const url = new URL(partitionUrl('Göteborg') ?? '');
    expect(url.pathname).toBe(
      '/sv/till_salu/l%C3%A4genhet/v%C3%A4stra%20g%C3%B6talands/g%C3%B6teborg',
    );
    expect(robotsAllows(parseRobots(ROBOTS), url.pathname)).toBe(true);
    expect(partitionUrl('Malmö')).toBeNull();
  });
});

describe('guarded run', () => {
  it('sends an honest user agent and no cookies, credentials or redirects', async () => {
    const { impl, calls } = fakeFetch(
      robotsOr(() => ({ body: nextPage([1], 1) })),
    );
    await runBoneoCollection(goteborg, deps(impl));
    expect(calls).toHaveLength(2);
    for (const { init } of calls) {
      expect(init.headers).toEqual({
        'user-agent': USER_AGENT,
        accept: 'text/html,text/plain',
      });
      expect(init.credentials).toBe('omit');
      expect(init.redirect).toBe('manual');
      expect(init.signal).toBeInstanceOf(AbortSignal);
    }
    expect(USER_AGENT).toBe(
      'HouseScannerPersonalReader/0.1 (private household tool)',
    );
  });

  it('refuses a disallowed path before fetching any search page', async () => {
    const { impl, calls } = fakeFetch((url) =>
      url.endsWith('/robots.txt')
        ? {
            body: 'User-agent: *\nDisallow: /sv/till_salu/\n',
            type: 'text/plain',
          }
        : { body: nextPage([1], 1) },
    );
    const result = await runBoneoCollection(goteborg, deps(impl));
    expect(result.stopped).toBe('robots-disallow');
    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      '/robots.txt',
    ]);
    expect(result.observations).toEqual([]);
  });

  it('refuses when robots.txt cannot be read', async () => {
    const { impl, calls } = fakeFetch(() => ({ status: 404 }));
    const result = await runBoneoCollection(goteborg, deps(impl));
    expect(result.stopped).toBe('robots-unavailable');
    expect(calls).toHaveLength(1);
  });

  it('waits at least two seconds between requests', async () => {
    vi.useFakeTimers();
    const { impl, spy } = fakeFetch(
      robotsOr((_url, n) => ({ body: nextPage([n], 9) })),
    );
    const run = runBoneoCollection(goteborg, {
      ...defaultLiveDeps(() => undefined),
      fetch: impl,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(spy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1999);
    expect(spy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(spy).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1999);
    expect(spy).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(spy).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(20_000);
    await run;
  });

  it('stops at forty pages per partition and reports truncation', async () => {
    let id = 0;
    const { impl, calls } = fakeFetch(
      robotsOr(() => ({ body: nextPage([++id, ++id], 500) })),
    );
    const result = await runBoneoCollection(goteborg, deps(impl));
    expect(calls.filter((c) => !c.url.endsWith('robots.txt'))).toHaveLength(40);
    expect(calls.at(-1)?.url).toContain('?page=40');
    expect(result.partitions[0]).toMatchObject({
      status: 'truncated',
      reason: 'page-cap',
      pages: 40,
      total: 500,
    });
  });

  it('stops at one thousand observations per run and reports truncation', async () => {
    let id = 0;
    const { impl, calls } = fakeFetch(
      robotsOr(() => ({
        body: nextPage(
          Array.from({ length: 30 }, () => ++id),
          5000,
        ),
      })),
    );
    const result = await runBoneoCollection(goteborg, deps(impl));
    expect(result.observations).toHaveLength(1000);
    expect(calls).toHaveLength(35);
    expect(result.partitions[0]).toMatchObject({
      status: 'truncated',
      reason: 'observation-cap',
      pages: 34,
      observations: 1000,
    });
  });

  it('stops at sixty requests per run including robots.txt', async () => {
    let id = 0;
    const { impl, calls } = fakeFetch(
      robotsOr(() => ({ body: nextPage([++id], 500) })),
    );
    const many = Array.from({ length: 8 }, (_v, index) => ({
      ...goteborg[0],
      id: `municipality-${index + 1}`,
    }));
    const result = await runBoneoCollection(many, deps(impl));
    expect(calls).toHaveLength(60);
    expect(result.requestCount).toBe(60);
    expect(result.stopped).toBe('request-cap');
  });

  it.each([
    [500, 'http-non-200'],
    [404, 'http-non-200'],
    [302, 'http-non-200'],
    [403, 'http-403'],
    [429, 'http-429'],
  ])('stops on status %i without retrying', async (status, reason) => {
    const { impl, calls } = fakeFetch(robotsOr(() => ({ status })));
    const result = await runBoneoCollection(goteborg, deps(impl));
    expect(result.stopped).toBe(reason);
    expect(calls).toHaveLength(2);
    expect(result.partitions[0]).toMatchObject({ status: 'failed', reason });
  });

  it('stops on a network error or timeout', async () => {
    const cases: [Error, string][] = [
      [new TypeError('socket'), 'network-error'],
      [new DOMException('late', 'TimeoutError'), 'timeout'],
    ];
    for (const [error, reason] of cases) {
      const { impl } = fakeFetch(robotsOr(() => error));
      const result = await runBoneoCollection(goteborg, deps(impl));
      expect(result.stopped).toBe(reason);
    }
  });

  it('treats a page without embedded data as failed coverage, not empty', async () => {
    const { impl } = fakeFetch(
      robotsOr(() => ({ body: fixture('blocked-page.html') })),
    );
    const result = await runBoneoCollection(goteborg, deps(impl));
    expect(result.stopped).toBe('no-embedded-data');
    expect(result.partitions[0]).toMatchObject({
      status: 'failed',
      reason: 'no-embedded-data',
      observations: 0,
    });
  });

  it('reads several pages and de-duplicates across them', async () => {
    const { impl } = fakeFetch(
      robotsOr((url) => ({
        body: url.includes('page=2')
          ? nextPage([2, 3], 4)
          : nextPage([1, 2], 4),
      })),
    );
    const result = await runBoneoCollection(goteborg, deps(impl));
    expect(result.observations.map((o) => o.sourceListingId)).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(result.partitions[0]).toMatchObject({ status: 'read', pages: 2 });
  });

  it('marks unsupported municipalities without requesting them', async () => {
    const { impl, calls } = fakeFetch(robotsOr(() => ({ body: '' })));
    const result = await runBoneoCollection(
      [
        {
          id: 'municipality-1',
          municipality: 'Malmö',
          propertyTypes: ['apartment'],
        },
      ],
      deps(impl),
    );
    expect(result.partitions[0].status).toBe('unsupported');
    expect(calls).toHaveLength(1);
  });

  it('logs counts, statuses and partition names only', async () => {
    const events: LiveEvent[] = [];
    const { impl } = fakeFetch(
      robotsOr(() => ({ body: fixture('search-page.html') })),
    );
    await runBoneoCollection(goteborg, deps(impl, events));
    const text = JSON.stringify(events);
    for (const value of [
      'Exempelgatan',
      'fixture',
      'boneo.se',
      '3001000',
      'Göteborg',
      'https://',
    ])
      expect(text).not.toContain(value);
    expect(events.some((event) => event.partition === 'municipality-1')).toBe(
      true,
    );
  });
});

describe('prepared run', () => {
  const capability = sourceRegistry().find(
    (entry) => entry.policy.sourceId === 'boneo',
  );
  if (!capability) throw new Error('boneo missing');
  const profile = SYNTHETIC_SNAPSHOT.profiles[0];
  const planning = {
    profiles: [
      {
        id: profile.id,
        revision: profile.revision,
        enabled: true,
        criteria: {
          ...profile.criteria,
          minAreaM2: 20,
          minRooms: 1,
          stretchPriceSek: 10_000_000,
          geography: {
            ...profile.criteria.geography,
            municipalities: ['Göteborg'],
          },
        },
      },
    ],
    collectionPriceCapSek: null,
    maxPartitions: 5,
  };

  it('registers boneo as pending with honest capabilities', () => {
    expect(capability.policy).toMatchObject({
      status: 'pending',
      automatedCollection: false,
      imageDisplay: false,
      imageHotlink: false,
      retentionDays: 14,
      capabilities: {
        upcoming: false,
        unknownPrice: false,
        pagination: false,
      },
    });
    expect(capability.policy.capabilities.coverageGaps.length).toBeGreaterThan(
      3,
    );
    expect(() =>
      assertSourceAllowed(capability.policy, new Date('2026-10-13T00:00:00Z')),
    ).toThrow();
    const plan = planQueries({ ...planning, capability });
    expect(plan.permission).toBe('denied-no-permission');
    expect(plan.partitions.map((p) => p.municipality)).toEqual(['Göteborg']);
  });

  it('builds valid requests and never reports success', async () => {
    const { impl } = fakeFetch(
      robotsOr(() => ({ body: fixture('search-page.html') })),
    );
    const prepared = await prepareLiveRun(
      {
        runId: '00000000-0000-4000-8000-000000000201',
        batchId: '00000000-0000-4000-8000-000000000202',
        capability,
        planning,
      },
      deps(impl),
    );
    expect(prepared.requests.map((r) => r.action)).toEqual([
      'begin',
      'stage',
      'publish',
    ]);
    const publish = prepared.requests[2];
    expect(publish.action === 'publish' && publish.results[0]).toMatchObject({
      sourceId: 'boneo',
      status: 'partial',
      cursor: null,
    });
    expect(prepared.result.observations).toHaveLength(8);
  });

  it('drops confirmed misfits, counts them by reason and still publishes partial', async () => {
    const { impl } = fakeFetch(
      robotsOr(() => ({ body: fixture('search-page.html') })),
    );
    const strict = {
      ...planning,
      profiles: [
        {
          ...planning.profiles[0],
          criteria: {
            ...planning.profiles[0].criteria,
            minAreaM2: 5000,
            maxAreaM2: null,
          },
        },
      ],
    };
    const prepared = await prepareLiveRun(
      { capability, planning: strict },
      deps(impl),
    );
    expect(prepared.result.observations).toHaveLength(8);
    expect(prepared.prefilter.kept).toBe(0);
    expect(
      Object.values(prepared.prefilter.dropped).reduce((a, b) => a + b, 0),
    ).toBe(8);
    expect(prepared.requests.map((r) => r.action)).toEqual([
      'begin',
      'publish',
    ]);
    const publish = prepared.requests[1];
    expect(publish.action === 'publish' && publish.results[0]).toMatchObject({
      status: 'partial',
    });
    expect(
      publish.action === 'publish' && publish.results[0].coverageNote,
    ).toContain('0 observations kept, 8 dropped');
  });

  it('splits kept observations into stage requests of at most one hundred', async () => {
    const { impl } = fakeFetch(
      robotsOr((url) => {
        const page = Number(new URL(url).searchParams.get('page') ?? '1');
        return {
          body: nextPage(
            Array.from({ length: 25 }, (_v, i) => page * 100 + i),
            250,
          ),
        };
      }),
    );
    const prepared = await prepareLiveRun(
      {
        batchId: '00000000-0000-4000-8000-000000000202',
        capability,
        planning,
      },
      deps(impl),
    );
    expect(prepared.requests.map((r) => r.action)).toEqual([
      'begin',
      'stage',
      'stage',
      'stage',
      'publish',
    ]);
    const stages = prepared.requests.flatMap((r) =>
      r.action === 'stage' ? [r] : [],
    );
    expect(stages.map((s) => s.observations.length)).toEqual([100, 100, 50]);
    expect(stages[0].batchId).toBe('00000000-0000-4000-8000-000000000202');
    expect(new Set(stages.map((s) => s.batchId)).size).toBe(3);
    expect(
      new Set(
        stages.flatMap((s) => s.observations.map((o) => o.sourceListingId)),
      ).size,
    ).toBe(250);
  });

  it('publishes failed coverage and no stage when the first page lacks data', async () => {
    const { impl } = fakeFetch(
      robotsOr(() => ({ body: fixture('blocked-page.html') })),
    );
    const prepared = await prepareLiveRun({ capability, planning }, deps(impl));
    expect(prepared.publishStatus).toBe('failed');
    expect(prepared.requests.map((r) => r.action)).toEqual([
      'begin',
      'publish',
    ]);
  });

  it('refuses a capability whose executor is not this adapter', async () => {
    const demo = sourceRegistry()[0];
    const { impl, calls } = fakeFetch(() => ({ body: '' }));
    await expect(
      prepareLiveRun({ capability: demo, planning }, deps(impl)),
    ).rejects.toThrow('No permitted executor');
    expect(calls).toHaveLength(0);
  });
});
