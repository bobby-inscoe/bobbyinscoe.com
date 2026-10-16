import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertAdapterOutput,
  defaultLiveDeps,
  type LiveDeps,
  type LiveEvent,
  MAX_DETAIL_PAGES_PER_RUN,
  MAX_REQUESTS_PER_RUN,
  parseRobots,
  partitionUrl,
  prepareLiveRun,
  robotsAllows,
  runBoneoCollection,
  USER_AGENT,
} from '@house-scanner-tools/boneo-live';

import { readBoneoSearchPage } from '@house-scanner-tools/boneo-parser';
import { planQueries } from '@house-scanner-tools/query-plan';
import { sourceRegistry } from '@house-scanner-tools/source-registry';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SYNTHETIC_SNAPSHOT } from '@/features/house-scanner/mock/synthetic-household';
import type { Observation } from '@/features/house-scanner/types/contracts';
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

  it('stops at 250 requests per run including robots.txt', async () => {
    let id = 0;
    const { impl, calls } = fakeFetch(
      robotsOr(() => ({ body: nextPage([++id], 500) })),
    );
    const many = Array.from({ length: 8 }, (_v, index) => ({
      ...goteborg[0],
      id: `municipality-${index + 1}`,
    }));
    const result = await runBoneoCollection(many, deps(impl));
    expect(calls).toHaveLength(250);
    expect(result.requestCount).toBe(250);
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
      imageDisplay: true,
      imageHotlink: true,
      imageOrigins: ['https://files.boneo.se'],
      retentionDays: 14,
      revision: 3,
      capabilities: {
        upcoming: false,
        unknownPrice: false,
        pagination: false,
      },
    });
    expect(capability.policy.capabilities.coverageGaps.length).toBeGreaterThan(
      3,
    );
    expect(capability.policy.allowedFactFields).toEqual(
      expect.arrayContaining(['outdoor', 'glazed']),
    );
    const gaps = capability.policy.capabilities.coverageGaps.join(' ');
    expect(gaps).not.toContain('not structured fields');
    expect(gaps).toContain('Floor, lift and build year are not collected');
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

  it('reads the page of each kept listing and stages outdoor and glazed', async () => {
    const { impl, calls } = fakeFetch(
      robotsOr((url) => ({
        body: url.includes('/bostad/')
          ? fixture('detail-glazed.html')
          : fixture('search-page.html'),
      })),
    );
    const prepared = await prepareLiveRun({ capability, planning }, deps(impl));
    const pages = calls.filter((call) => call.url.includes('/bostad/'));
    expect(pages.length).toBeGreaterThan(0);
    expect(prepared.result.detailRead).toBe(pages.length);
    expect(prepared.prefilter.kept).toBe(pages.length);
    const stage = prepared.requests[1];
    expect(
      stage.action === 'stage' && stage.observations[0].facts,
    ).toMatchObject({ outdoor: 'balcony', glazed: true });
    const publish = prepared.requests.at(-1);
    expect(
      publish?.action === 'publish' && publish.results[0].coverageNote,
    ).toContain(`Listing pages: ${pages.length} read, 0 failed, 0 skipped`);
  });

  it('never reads the page of a listing the pre-filter drops', async () => {
    const { impl, calls } = fakeFetch(
      robotsOr((url) => ({
        body: url.includes('/bostad/')
          ? fixture('detail-both.html')
          : fixture('search-page.html'),
      })),
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
    expect(prepared.prefilter.kept).toBe(0);
    expect(calls.filter((call) => call.url.includes('/bostad/'))).toEqual([]);
    expect(prepared.result).toMatchObject({
      detailRead: 0,
      detailFailed: 0,
      detailSkipped: 0,
    });
  });

  it('rejects outdoor and glazed unless the policy allows them', () => {
    const read = readBoneoSearchPage(fixture('search-page.html'), {
      origin: 'https://www.boneo.se',
      observedAt: new Date('2026-10-13T09:00:00.000Z'),
      receivedBefore: 0,
    });
    if (read.kind !== 'page') throw new Error('fixture failed');
    const observation = read.observations[0];
    observation.facts.outdoor = 'balcony';
    expect(() =>
      assertAdapterOutput(capability.policy, observation),
    ).not.toThrow();
    const narrowed = {
      ...capability.policy,
      allowedFactFields: capability.policy.allowedFactFields.filter(
        (field) => field !== 'outdoor',
      ),
    };
    expect(() => assertAdapterOutput(narrowed, observation)).toThrow(
      'unapproved fact field',
    );
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

describe('listing pages', () => {
  const isDetail = (url: string) => url.includes('/bostad/');
  const listingId = (url: string) => Number(url.split('-').at(-1));
  // 25 listings per page, ids 1..total, like a real multi-page result.
  const searchReply = (url: string, total: number) => {
    const page = Number(new URL(url).searchParams.get('page') ?? '1');
    const first = (page - 1) * 25 + 1;
    const last = Math.min(total, page * 25);
    const ids = Array.from({ length: last - first + 1 }, (_v, i) => first + i);
    return { body: nextPage(ids, total) };
  };
  const serve =
    (total: number, detail: (id: number) => Reply) =>
    (url: string): Reply =>
      isDetail(url) ? detail(listingId(url)) : searchReply(url, total);
  const detailCalls = (calls: { url: string }[]) =>
    calls.filter((call) => isDetail(call.url));
  const BALCONY = fixture('detail-balcony.html');
  const keepAll = (all: Observation[]) => all;

  it('reads each kept listing page once and merges only outdoor and glazed', async () => {
    const files = [
      'detail-balcony.html',
      'detail-both.html',
      'detail-glazed.html',
    ];
    const { impl, calls } = fakeFetch(
      robotsOr(serve(3, (id) => ({ body: fixture(files[id - 1]) }))),
    );
    const result = await runBoneoCollection(goteborg, deps(impl), keepAll);
    expect(
      result.observations.map((o) => [o.facts.outdoor, o.facts.glazed]),
    ).toEqual([
      ['balcony', null],
      ['both', null],
      ['balcony', true],
    ]);
    expect(result).toMatchObject({
      detailRead: 3,
      detailFailed: 0,
      detailSkipped: 0,
      requestCount: 5,
      stopped: null,
    });
    expect(calls.filter((c) => c.url.endsWith('/robots.txt'))).toHaveLength(1);
    expect(detailCalls(calls).map((c) => new URL(c.url).pathname)).toEqual([
      '/bostad/fixture-1',
      '/bostad/fixture-2',
      '/bostad/fixture-3',
    ]);
    for (const { init } of calls) {
      expect(init.headers).toEqual({
        'user-agent': USER_AGENT,
        accept: 'text/html,text/plain',
      });
      expect(init.credentials).toBe('omit');
      expect(init.redirect).toBe('manual');
    }
  });

  it('reads no listing page unless the caller keeps the observation', async () => {
    const { impl, calls } = fakeFetch(
      robotsOr(serve(3, () => ({ body: BALCONY }))),
    );
    const result = await runBoneoCollection(goteborg, deps(impl), (all) =>
      all.filter((o) => o.sourceListingId === '2'),
    );
    expect(detailCalls(calls).map((c) => c.url)).toEqual([
      'https://www.boneo.se/bostad/fixture-2',
    ]);
    expect(result.observations.map((o) => o.facts.outdoor)).toEqual([
      null,
      'balcony',
      null,
    ]);
    const plain = fakeFetch(robotsOr(serve(3, () => ({ body: BALCONY }))));
    await runBoneoCollection(goteborg, deps(plain.impl));
    expect(detailCalls(plain.calls)).toHaveLength(0);
  });

  it('waits at least two seconds before every listing page', async () => {
    vi.useFakeTimers();
    const { impl, spy } = fakeFetch(
      robotsOr(serve(2, () => ({ body: BALCONY }))),
    );
    const run = runBoneoCollection(
      goteborg,
      { ...defaultLiveDeps(() => undefined), fetch: impl },
      keepAll,
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(spy).toHaveBeenCalledTimes(1);
    // search page, then two listing pages
    for (const expected of [2, 3, 4]) {
      await vi.advanceTimersByTimeAsync(1999);
      expect(spy).toHaveBeenCalledTimes(expected - 1);
      await vi.advanceTimersByTimeAsync(1);
      expect(spy).toHaveBeenCalledTimes(expected);
    }
    await run;
  });

  it('skips listing pages that robots.txt disallows, without failing the run', async () => {
    const { impl, calls } = fakeFetch((url) =>
      url.endsWith('/robots.txt')
        ? {
            body: 'User-agent: *\nAllow: /\nDisallow: /bostad/\n',
            type: 'text/plain',
          }
        : serve(3, () => ({ body: BALCONY }))(url),
    );
    const result = await runBoneoCollection(goteborg, deps(impl), keepAll);
    expect(detailCalls(calls)).toHaveLength(0);
    expect(result).toMatchObject({
      detailRead: 0,
      detailSkipped: 3,
      stopped: null,
    });
    expect(result.observations).toHaveLength(3);
  });

  it('reads at most 150 listing pages per run and counts the rest as skipped', async () => {
    expect(MAX_DETAIL_PAGES_PER_RUN).toBe(150);
    const { impl, calls } = fakeFetch(
      robotsOr(serve(160, () => ({ body: BALCONY }))),
    );
    const result = await runBoneoCollection(goteborg, deps(impl), keepAll);
    expect(detailCalls(calls)).toHaveLength(150);
    expect(result).toMatchObject({
      detailRead: 150,
      detailFailed: 0,
      detailSkipped: 10,
      requestCount: 158,
      stopped: null,
    });
    expect(
      result.observations.filter((o) => o.facts.outdoor === null),
    ).toHaveLength(10);
  });

  it('shares the 250 request cap with search pages and skips what it cannot request', async () => {
    expect(MAX_REQUESTS_PER_RUN).toBe(250);
    let id = 0;
    const { impl, calls } = fakeFetch(
      robotsOr((url) =>
        isDetail(url) ? { body: BALCONY } : { body: nextPage([++id], 500) },
      ),
    );
    const four = Array.from({ length: 4 }, (_v, index) => ({
      ...goteborg[0],
      id: `municipality-${index + 1}`,
    }));
    const result = await runBoneoCollection(four, deps(impl), keepAll);
    // robots.txt and 160 search pages leave room for 89 listing pages.
    expect(calls).toHaveLength(250);
    expect(result).toMatchObject({
      requestCount: 250,
      detailRead: 89,
      detailSkipped: 71,
      stopped: null,
    });
  });

  it('counts a failed listing page and carries on', async () => {
    const replies: Reply[] = [
      { status: 500 },
      { status: 404 },
      { body: fixture('blocked-page.html') },
      { body: fixture('detail-wrong-shape.html') },
      { body: BALCONY },
    ];
    const events: LiveEvent[] = [];
    const { impl, calls } = fakeFetch(
      robotsOr(serve(5, (id) => replies[id - 1])),
    );
    const result = await runBoneoCollection(
      goteborg,
      deps(impl, events),
      keepAll,
    );
    expect(detailCalls(calls)).toHaveLength(5);
    expect(result).toMatchObject({
      detailRead: 1,
      detailFailed: 4,
      detailSkipped: 0,
      stopped: null,
    });
    expect(result.observations.map((o) => o.facts.outdoor)).toEqual([
      null,
      null,
      null,
      null,
      'balcony',
    ]);
    expect(
      events.filter((e) => e.event === 'detail-failed').map((e) => e.reason),
    ).toEqual([
      'http-non-200',
      'http-non-200',
      'no-embedded-data',
      'unexpected-shape',
    ]);
    expect(JSON.stringify(events)).not.toMatch(/https:|boneo|fixture/);
  });

  it.each([
    [{ status: 403 }, 'http-403'],
    [{ status: 429 }, 'http-429'],
    [new TypeError('socket'), 'network-error'],
    [new DOMException('late', 'TimeoutError'), 'timeout'],
  ] as [Reply, string][])(
    'stops the whole run on listing page failure %#',
    async (stop, reason) => {
      const { impl, calls } = fakeFetch(
        robotsOr(serve(4, (id) => (id === 2 ? stop : { body: BALCONY }))),
      );
      const result = await runBoneoCollection(goteborg, deps(impl), keepAll);
      expect(result.stopped).toBe(reason);
      expect(detailCalls(calls)).toHaveLength(2);
      expect(result).toMatchObject({ detailRead: 1, detailFailed: 0 });
      expect(result.observations.map((o) => o.facts.outdoor)).toEqual([
        'balcony',
        null,
        null,
        null,
      ]);
    },
  );
});
