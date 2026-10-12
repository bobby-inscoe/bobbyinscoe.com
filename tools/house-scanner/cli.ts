import { parseArgs } from 'node:util';
import { prepareFixtureRun } from '@house-scanner-tools/collector';
import {
  DEMO_SOURCE_ID,
  sourceRegistry,
} from '@house-scanner-tools/source-registry';
import { z } from 'zod';
import { criteriaSchema } from '@/features/house-scanner/types/contracts';

function main() {
  const { values } = parseArgs({
    options: {
      mode: { type: 'string', default: 'fixture' },
      source: { type: 'string', default: DEMO_SOURCE_ID },
      at: { type: 'string', default: '2026-10-12T12:00:00Z' },
      'run-id': {
        type: 'string',
        default: '00000000-0000-4000-8000-000000000101',
      },
      'batch-id': {
        type: 'string',
        default: '00000000-0000-4000-8000-000000000102',
      },
    },
    allowPositionals: false,
    strict: true,
  });
  if (values.mode !== 'fixture') throw new Error('Only fixture mode exists.');
  const capability = sourceRegistry().find(
    (entry) => entry.policy.sourceId === values.source,
  );
  if (!capability) throw new Error('Unknown source.');
  const criteria = criteriaSchema.parse({
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
    geography: {
      municipalities: ['Example municipality'],
      center: [0, 0],
      radiusKm: 10,
    },
    nature: { preferImmediateGreenery: false, preferredWalkMinutes: 10 },
    transit: {
      preferredWalkMinutes: 10,
      preferredJourneyMinutes: 30,
      tradeoffJourneyMinutes: 45,
    },
  });
  const prepared = prepareFixtureRun({
    runId: values['run-id'],
    batchId: values['batch-id'],
    at: values.at,
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
  main();
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
