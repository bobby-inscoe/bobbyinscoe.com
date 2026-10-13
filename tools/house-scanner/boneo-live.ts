import { randomUUID } from 'node:crypto';
import { readBoneoSearchPage } from '@house-scanner-tools/boneo-parser';
import {
  MAX_RUN_OBSERVATIONS,
  sourceIdentity,
} from '@house-scanner-tools/collector';
import {
  planQueries,
  type queryPlanInputSchema,
} from '@house-scanner-tools/query-plan';
import type { SourceCapability } from '@house-scanner-tools/source-registry';
import {
  BONEO_ORIGIN,
  BONEO_SOURCE_ID,
} from '@house-scanner-tools/source-registry';
import type { z } from 'zod';
import {
  CONTRACT_VERSION,
  ingestRequestSchema,
  type Observation,
  observationSchema,
} from '@/features/house-scanner/types/contracts';

export const USER_AGENT =
  'HouseScannerPersonalReader/0.1 (private household tool)';
const ROBOTS_TOKEN = 'housescannerpersonalreader';
export const MIN_INTERVAL_MS = 2000;
export const MAX_PAGES_PER_PARTITION = 5;
export const MAX_REQUESTS_PER_RUN = 30;
export const REQUEST_TIMEOUT_MS = 15_000;
export const MAX_BODY_CHARS = 3_000_000;

// Path segments proven from one public Goteborg district URL. The municipality
// level path is derived by dropping the district segment and is unproven. A
// wrong guess surfaces as a page without embedded data, which fails coverage.
const APARTMENT_SEGMENT = 'lägenhet';
const MUNICIPALITY_PATHS: Record<string, readonly [string, string]> = {
  göteborg: ['västra götalands', 'göteborg'],
};

export interface RobotsRules {
  rules: { allow: boolean; pattern: RegExp; length: number }[];
}

export function parseRobots(body: string): RobotsRules {
  type Group = { agents: string[]; rules: [boolean, string][] };
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === 'user-agent') {
      if (!lastWasAgent || current === null) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if ((field === 'allow' || field === 'disallow') && current && value !== '')
      current.rules.push([field === 'allow', value]);
  }
  const named = groups.filter((group) =>
    group.agents.some((agent) => agent !== '*' && ROBOTS_TOKEN.includes(agent)),
  );
  const chosen = named.length
    ? named
    : groups.filter((group) => group.agents.includes('*'));
  return {
    rules: chosen.flatMap((group) =>
      group.rules.map(([allow, raw]) => {
        const anchored = raw.endsWith('$');
        const source = (anchored ? raw.slice(0, -1) : raw)
          .split('*')
          .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
          .join('.*');
        return {
          allow,
          pattern: new RegExp(`^${source}${anchored ? '$' : ''}`),
          length: raw.replace(/\*/g, '').length,
        };
      }),
    ),
  };
}

export function robotsAllows(robots: RobotsRules, pathAndQuery: string) {
  let best: { allow: boolean; length: number } | null = null;
  for (const rule of robots.rules) {
    if (!rule.pattern.test(pathAndQuery)) continue;
    if (
      best === null ||
      rule.length > best.length ||
      (rule.length === best.length && rule.allow)
    )
      best = rule;
  }
  return best === null || best.allow;
}

export function partitionUrl(municipality: string): string | null {
  const parts = MUNICIPALITY_PATHS[municipality.trim().toLowerCase()];
  if (!parts) return null;
  return `${BONEO_ORIGIN}/sv/till_salu/${[APARTMENT_SEGMENT, ...parts]
    .map(encodeURIComponent)
    .join('/')}`;
}

export type StopReason =
  | 'robots-unavailable'
  | 'robots-disallow'
  | 'request-cap'
  | 'http-429'
  | 'http-403'
  | 'http-non-200'
  | 'network-error'
  | 'timeout'
  | 'not-html'
  | 'oversize'
  | 'no-embedded-data'
  | 'invalid-embedded-data'
  | 'unexpected-shape'
  | 'inconsistent-count'
  | 'too-large';

export type PartitionStatus =
  | 'read'
  | 'truncated'
  | 'failed'
  | 'unsupported'
  | 'not-executed';

export interface LivePartitionInput {
  id: string;
  municipality: string;
  propertyTypes: readonly ('apartment' | 'house')[];
}

export interface PartitionOutcome {
  id: string;
  municipality: string;
  status: PartitionStatus;
  pages: number;
  observations: number;
  skipped: number;
  total: number | null;
  reason: string | null;
}

export interface LiveEvent {
  event: string;
  partition?: string;
  status?: number;
  count?: number;
  reason?: string;
}

export interface LiveDeps {
  fetch: typeof fetch;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  log: (event: LiveEvent) => void;
}

export function defaultLiveDeps(log: (event: LiveEvent) => void): LiveDeps {
  return {
    fetch: (input, init) => fetch(input, init),
    now: () => Date.now(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log,
  };
}

export interface LiveRunResult {
  observations: Observation[];
  partitions: PartitionOutcome[];
  requestCount: number;
  stopped: StopReason | null;
}

export async function runBoneoCollection(
  partitions: readonly LivePartitionInput[],
  deps: LiveDeps,
): Promise<LiveRunResult> {
  let requestCount = 0;
  let lastFinishedAt: number | null = null;
  const observations: Observation[] = [];
  const seen = new Set<string>();
  const outcomes: PartitionOutcome[] = partitions.map((partition) => ({
    id: partition.id,
    municipality: partition.municipality,
    status: 'not-executed',
    pages: 0,
    observations: 0,
    skipped: 0,
    total: null,
    reason: null,
  }));

  type Fetched =
    | { ok: true; status: number; body: string }
    | { ok: false; stop: StopReason; status?: number };

  async function request(url: string): Promise<Fetched> {
    if (requestCount >= MAX_REQUESTS_PER_RUN)
      return { ok: false, stop: 'request-cap' };
    if (lastFinishedAt !== null) {
      const wait = MIN_INTERVAL_MS - (deps.now() - lastFinishedAt);
      if (wait > 0) await deps.sleep(wait);
    }
    requestCount += 1;
    let response: Response;
    let body: string;
    try {
      response = await deps.fetch(url, {
        method: 'GET',
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,text/plain' },
        redirect: 'manual',
        credentials: 'omit',
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const declared = Number(response.headers.get('content-length'));
      if (declared > MAX_BODY_CHARS) {
        lastFinishedAt = deps.now();
        return { ok: false, stop: 'oversize', status: response.status };
      }
      body = await response.text();
    } catch (error) {
      lastFinishedAt = deps.now();
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      return { ok: false, stop: timedOut ? 'timeout' : 'network-error' };
    }
    lastFinishedAt = deps.now();
    if (response.status === 429)
      return { ok: false, stop: 'http-429', status: 429 };
    if (response.status === 403)
      return { ok: false, stop: 'http-403', status: 403 };
    if (response.status !== 200)
      return { ok: false, stop: 'http-non-200', status: response.status };
    if (body.length > MAX_BODY_CHARS)
      return { ok: false, stop: 'oversize', status: 200 };
    return { ok: true, status: 200, body };
  }

  function finish(stopped: StopReason | null): LiveRunResult {
    deps.log({
      event: 'run-finished',
      count: observations.length,
      reason: stopped ?? 'none',
    });
    return { observations, partitions: outcomes, requestCount, stopped };
  }

  const robotsUrl = `${BONEO_ORIGIN}/robots.txt`;
  const robotsResponse = await request(robotsUrl);
  deps.log({
    event: 'robots',
    status: robotsResponse.ok ? 200 : robotsResponse.status,
  });
  if (!robotsResponse.ok) return finish('robots-unavailable');
  const robots = parseRobots(robotsResponse.body);

  for (const [index, partition] of partitions.entries()) {
    const outcome = outcomes[index];
    const base = partitionUrl(partition.municipality);
    if (base === null) {
      outcome.status = 'unsupported';
      outcome.reason = 'municipality-path-unproven';
      deps.log({ event: 'partition-unsupported', partition: partition.id });
      continue;
    }
    if (!partition.propertyTypes.includes('apartment')) {
      outcome.status = 'unsupported';
      outcome.reason = 'only-apartment-path-known';
      deps.log({ event: 'partition-unsupported', partition: partition.id });
      continue;
    }
    for (let page = 1; page <= MAX_PAGES_PER_PARTITION; page += 1) {
      const url = page === 1 ? base : `${base}?page=${page}`;
      const parsedUrl = new URL(url);
      if (!robotsAllows(robots, `${parsedUrl.pathname}${parsedUrl.search}`)) {
        outcome.status = 'failed';
        outcome.reason = 'robots-disallow';
        deps.log({ event: 'robots-disallow', partition: partition.id });
        return finish('robots-disallow');
      }
      const fetched = await request(url);
      if (!fetched.ok) {
        outcome.status = 'failed';
        outcome.reason = fetched.stop;
        deps.log({
          event: 'request-stopped',
          partition: partition.id,
          status: fetched.status,
          reason: fetched.stop,
        });
        return finish(fetched.stop);
      }
      outcome.pages = page;
      const read = readBoneoSearchPage(fetched.body, {
        origin: BONEO_ORIGIN,
        observedAt: new Date(deps.now()),
        receivedBefore: outcome.observations + outcome.skipped,
      });
      if (read.kind === 'failed') {
        // A page without usable data is failed coverage, never an empty result.
        outcome.status = 'failed';
        outcome.reason = read.reason;
        deps.log({
          event: 'page-failed',
          partition: partition.id,
          status: 200,
          reason: read.reason,
        });
        return finish(read.reason);
      }
      const room = MAX_RUN_OBSERVATIONS - observations.length;
      const fresh = read.observations.filter((observation) => {
        const key = sourceIdentity(BONEO_SOURCE_ID, observation);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const taken = fresh.slice(0, room);
      observations.push(...taken);
      outcome.observations += taken.length;
      outcome.skipped +=
        read.skipped + (read.observations.length - taken.length);
      outcome.total = read.total;
      deps.log({
        event: 'page-read',
        partition: partition.id,
        status: 200,
        count: taken.length,
      });
      if (read.more.kind === 'none') {
        outcome.status = 'read';
        break;
      }
      if (taken.length < fresh.length || room - taken.length <= 0) {
        outcome.status = 'truncated';
        outcome.reason = 'observation-cap';
        break;
      }
      if (read.more.kind === 'unknown') {
        outcome.status = 'truncated';
        outcome.reason = read.more.reason;
        break;
      }
      if (page === MAX_PAGES_PER_PARTITION) {
        outcome.status = 'truncated';
        outcome.reason = 'page-cap';
      }
    }
  }
  return finish(null);
}

export interface LiveRunOptions {
  runId?: string;
  batchId?: string;
  capability: SourceCapability;
  planning: Omit<z.input<typeof queryPlanInputSchema>, 'capability'>;
}

export function assertBoneoExecutor(capability: SourceCapability): void {
  const { policy } = capability;
  if (
    capability.executor !== 'boneo-personal-read' ||
    policy.sourceId !== BONEO_SOURCE_ID ||
    policy.listingOrigins.length !== 1 ||
    policy.listingOrigins[0] !== BONEO_ORIGIN ||
    policy.imageOrigins.length !== 0 ||
    policy.imageDisplay ||
    policy.imageHotlink
  )
    throw new Error('No permitted executor for this source.');
}

/**
 * Narrower than assertObservationAllowed: it skips the approval status, which
 * is the operator's database step, and checks what this reader controls.
 */
export function assertAdapterOutput(
  policy: SourceCapability['policy'],
  observation: Observation,
): void {
  observationSchema.parse(observation);
  if (
    observation.photo !== null ||
    observation.evidence.length > 0 ||
    !policy.listingOrigins.includes(new URL(observation.sourceUrl).origin)
  )
    throw new Error('Adapter output is outside the source policy.');
  for (const [key, value] of Object.entries(observation.facts)) {
    if (
      value !== null &&
      value !== 'unknown' &&
      !policy.allowedFactFields.some((field) => field === key)
    )
      throw new Error('Adapter output includes an unapproved fact field.');
  }
}

export async function prepareLiveRun(options: LiveRunOptions, deps: LiveDeps) {
  assertBoneoExecutor(options.capability);
  const queryPlan = planQueries({
    ...options.planning,
    capability: options.capability,
  });
  const result = await runBoneoCollection(
    queryPlan.partitions.map(({ id, municipality, propertyTypes }) => ({
      id,
      municipality,
      propertyTypes,
    })),
    deps,
  );
  for (const observation of result.observations)
    assertAdapterOutput(options.capability.policy, observation);

  const read = result.partitions.filter((p) => p.status === 'read').length;
  const pages = result.partitions.reduce((sum, p) => sum + p.pages, 0);
  const runId = options.runId ?? randomUUID();
  const common = { contractVersion: CONTRACT_VERSION, runId };
  const failed = result.stopped !== null && result.observations.length === 0;
  // Never "success": upcoming and unknown-price views are not queried and
  // pagination is unproven.
  const coverageNote = [
    `Boneo personal read, query plan v${queryPlan.version}.`,
    `${read} of ${result.partitions.length} partitions read from ${pages} pages and ${result.requestCount} requests.`,
    `${result.observations.length} observations.`,
    result.stopped ? `Stopped: ${result.stopped}.` : 'Run completed.',
    'Not covered: upcoming and unknown-price views, houses, other municipalities, pages beyond the cap.',
  ].join(' ');
  const requests = [
    ingestRequestSchema.parse({
      ...common,
      action: 'begin',
      profileVersions: queryPlan.profileVersions,
      sourceIds: [BONEO_SOURCE_ID],
    }),
    ...(result.observations.length > 0
      ? [
          ingestRequestSchema.parse({
            ...common,
            action: 'stage',
            batchId: options.batchId ?? randomUUID(),
            sourceId: BONEO_SOURCE_ID,
            observations: result.observations,
          }),
        ]
      : []),
    ingestRequestSchema.parse({
      ...common,
      action: 'publish',
      results: [
        {
          sourceId: BONEO_SOURCE_ID,
          status: failed ? 'failed' : 'partial',
          cursor: null,
          coverageNote,
        },
      ],
    }),
  ];
  return {
    mode: 'live-read' as const,
    requests,
    queryPlan,
    result,
    publishStatus: failed ? ('failed' as const) : ('partial' as const),
  };
}
