import { parseArgs } from 'node:util';
import {
  defaultLiveDeps,
  type LiveEvent,
  prepareLiveRun,
} from '@house-scanner-tools/boneo-live';
import { prepareFixtureRun } from '@house-scanner-tools/collector';
import {
  BONEO_SOURCE_ID,
  DEMO_SOURCE_ID,
  sourceRegistry,
} from '@house-scanner-tools/source-registry';
import { z } from 'zod';
import { criteriaSchema } from '@/features/house-scanner/types/contracts';

function fixtureCriteria(municipalities: string[]) {
  return criteriaSchema.parse({
    minAreaM2: 60,
    maxAreaM2: 120,
    minRooms: 2,
    preferredPriceSek: 4_000_000,
    stretchPriceSek: 5_000_000,
    propertyTypes: ['apartment', 'house'],
    excludeGroundFloor: false,
    requireLift: false,
    requireOutdoor: false,
    preferGlazing: false,
    feeReferenceSek: 5_000,
    geography: { municipalities, center: [0, 0], radiusKm: 10 },
    nature: { preferImmediateGreenery: false, preferredWalkMinutes: 10 },
    transit: {
      preferredWalkMinutes: 10,
      preferredJourneyMinutes: 30,
      tradeoffJourneyMinutes: 45,
    },
  });
}

type Values = {
  source?: string;
  at?: string;
  'confirm-personal-read': boolean;
  municipality?: string[];
  'run-id'?: string;
  'batch-id'?: string;
};

// Live reads need three explicit flags and cover Boneo only. Output is counts,
// statuses and partition names; observations are never printed or saved.
async function live(values: Values) {
  if (values.source !== BONEO_SOURCE_ID)
    throw new Error('Live reading exists for boneo only.');
  if (!values['confirm-personal-read'])
    throw new Error('Live reading needs --confirm-personal-read.');
  if (values.at !== undefined)
    throw new Error('Live reads use the fetch time; --at does not apply.');
  const capability = sourceRegistry().find(
    (entry) => entry.policy.sourceId === BONEO_SOURCE_ID,
  );
  if (!capability) throw new Error('Unknown source.');
  const events: LiveEvent[] = [];
  const prepared = await prepareLiveRun(
    {
      runId: values['run-id'],
      batchId: values['batch-id'],
      capability,
      planning: {
        profiles: [
          {
            id: '00000000-0000-4000-8000-000000000103',
            revision: 1,
            enabled: true,
            criteria: fixtureCriteria(values.municipality ?? ['Göteborg']),
          },
        ],
        collectionPriceCapSek: null,
        maxPartitions: 5,
      },
    },
    defaultLiveDeps((event) => events.push(event)),
  );
  console.info(
    JSON.stringify(
      {
        mode: prepared.mode,
        liveCoverage: false,
        notice:
          'Partial personal read. Nothing sent or saved; the source is not approved.',
        publishStatus: prepared.publishStatus,
        stopped: prepared.result.stopped,
        requestCount: prepared.result.requestCount,
        observationCount: prepared.result.observations.length,
        partitions: prepared.result.partitions,
        events,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const { values } = parseArgs({
    options: {
      mode: { type: 'string', default: 'fixture' },
      source: { type: 'string', default: DEMO_SOURCE_ID },
      at: { type: 'string' },
      'run-id': { type: 'string' },
      'batch-id': { type: 'string' },
      live: { type: 'boolean', default: false },
      'confirm-personal-read': { type: 'boolean', default: false },
      municipality: { type: 'string', multiple: true },
    },
    allowPositionals: false,
    strict: true,
  });
  if (values.mode !== 'fixture') throw new Error('Only fixture mode exists.');
  if (values['confirm-personal-read'] && !values.live)
    throw new Error('The confirmation flag applies to live reads only.');
  if (values.live) return live(values);
  const capability = sourceRegistry().find(
    (entry) => entry.policy.sourceId === values.source,
  );
  if (!capability) throw new Error('Unknown source.');
  const criteria = fixtureCriteria(['Example municipality']);
  const prepared = prepareFixtureRun({
    runId: values['run-id'] ?? '00000000-0000-4000-8000-000000000101',
    batchId: values['batch-id'] ?? '00000000-0000-4000-8000-000000000102',
    at: values.at ?? '2026-10-12T12:00:00Z',
    capability,
    planning: {
      profiles: [
        {
          id: '00000000-0000-4000-8000-000000000103',
          revision: 1,
          enabled: true,
          criteria,
        },
      ],
      collectionPriceCapSek: null,
      maxPartitions: 100,
    },
  });
  // Payloads stay in memory. Logs contain no listing snapshots or private input.
  console.info(
    JSON.stringify(
      {
        mode: prepared.mode,
        liveCoverage: prepared.liveCoverage,
        notice:
          'No live coverage. Unsigned requests prepared in memory; nothing sent or saved.',
        observationCount: prepared.requests.reduce(
          (count, request) =>
            count +
            (request.action === 'stage' ? request.observations.length : 0),
          0,
        ),
        requestCount: prepared.requests.length,
        partitionCount: prepared.queryPlan.partitions.length,
        candidateSourceCount: sourceRegistry().filter(
          (entry) => entry.executor === 'none',
        ).length,
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} catch (error) {
  console.error(
    JSON.stringify({
      status: 'rejected',
      category:
        error instanceof z.ZodError
          ? 'invalid-input'
          : 'permission-or-configuration',
      notice:
        'Collector did not send or save data. Review fixture options and source permission.',
    }),
  );
  process.exitCode = 1;
}
