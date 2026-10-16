import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { beforeAll, expect, it } from 'vitest';
import { SYNTHETIC_SNAPSHOT } from '@/features/house-scanner/mock/synthetic-household';

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      resolve('node_modules/vite/bin/vite.js'),
      'build',
      '--config',
      'tools/house-scanner/vite.config.ts',
    ],
    { stdio: 'pipe' },
  );
});

it('reports actual observation and request counts without logging source payloads', () => {
  const result = spawnSync(
    process.execPath,
    ['.house-scanner-build/collector.mjs'],
    { encoding: 'utf8' },
  );
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({
    mode: 'fixture-dry',
    liveCoverage: false,
    observationCount: 3,
    requestCount: 3,
  });
  expect(result.stdout).not.toContain('https://');
  expect(result.stdout).not.toContain('Fictional demo home');
});

it.each([
  ['--mode', 'live'],
  ['--source', 'bjurfors'],
])('rejects unsupported execution options %j with safe output', (...args) => {
  const result = spawnSync(
    process.execPath,
    ['.house-scanner-build/collector.mjs', ...args],
    { encoding: 'utf8' },
  );
  expect(result.status).toBe(1);
  expect(JSON.parse(result.stderr)).toMatchObject({
    status: 'rejected',
    category: 'permission-or-configuration',
  });
  expect(result.stdout).toBe('');
  expect(result.stderr).not.toContain('https://');
});

it.each([
  [['--live']],
  [['--live', '--source=boneo']],
  [['--live', '--confirm-personal-read']],
  [
    [
      '--live',
      '--source=boneo',
      '--confirm-personal-read',
      '--at=2026-10-13T00:00:00Z',
    ],
  ],
  [['--live', '--source=bjurfors', '--confirm-personal-read']],
  [['--source=boneo', '--confirm-personal-read']],
  [['--source=boneo']],
])('refuses live reading without every flag: %j', (args) => {
  const result = spawnSync(
    process.execPath,
    ['.house-scanner-build/collector.mjs', ...args],
    { encoding: 'utf8', timeout: 10_000 },
  );
  expect(result.status).toBe(1);
  expect(JSON.parse(result.stderr)).toMatchObject({
    status: 'rejected',
    category: 'permission-or-configuration',
  });
  expect(result.stdout).toBe('');
});

// Every case below must be refused before the collector makes any request.
const SECRET = 'synthetic-cli-secret-not-real-0123456789abcdef';
const profilesPath = join(
  mkdtempSync(join(tmpdir(), 'hs-profiles-')),
  'profiles.json',
);
writeFileSync(
  profilesPath,
  JSON.stringify(
    SYNTHETIC_SNAPSHOT.profiles.map(({ id, revision, enabled, criteria }) => ({
      id,
      revision,
      enabled,
      criteria,
    })),
  ),
);
const LIVE = ['--live', '--source=boneo', '--confirm-personal-read'];

it.each([
  [[...LIVE]],
  [[...LIVE, '--send', '--profiles', profilesPath]],
  [[...LIVE, '--confirm-send', '--profiles', profilesPath]],
  [['--send', '--confirm-send']],
  [['--send', '--confirm-send', '--profiles', profilesPath]],
  [[...LIVE, '--profiles', join(tmpdir(), 'hs-missing-profiles.json')]],
])(
  'refuses live runs without a profiles file or with incomplete send flags: %j',
  (args) => {
    const result = spawnSync(
      process.execPath,
      ['.house-scanner-build/collector.mjs', ...args],
      { encoding: 'utf8', timeout: 10_000 },
    );
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr)).toMatchObject({ status: 'rejected' });
    expect(result.stdout).toBe('');
  },
);

it.each([
  [
    {
      HS_INGEST_URL:
        'http://project.example.invalid/functions/v1/house-scanner-ingest',
    },
  ],
  [
    {
      HS_INGEST_URL:
        'https://project.example.invalid/functions/v1/house-scanner-ingest',
      HS_INGEST_SECRET: 'too-short',
    },
  ],
  [{ HS_INGEST_URL: undefined }],
])(
  'refuses to send with an unusable ingest environment %j before reading',
  (change) => {
    const result = spawnSync(
      process.execPath,
      [
        '.house-scanner-build/collector.mjs',
        ...LIVE,
        '--send',
        '--confirm-send',
        '--profiles',
        profilesPath,
      ],
      {
        encoding: 'utf8',
        timeout: 10_000,
        env: {
          ...process.env,
          ...{
            HS_INGEST_URL:
              'https://project.example.invalid/functions/v1/house-scanner-ingest',
            HS_INGEST_KEY_ID: 'cli-key',
            HS_INGEST_SECRET: SECRET,
          },
          ...change,
        },
      },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).not.toContain(SECRET);
    expect(JSON.parse(result.stderr)).toMatchObject({ status: 'rejected' });
  },
);

const HOUSEHOLD = '00000000-0000-4000-8000-0000000000aa';
const runPrinter = (...args: string[]) =>
  spawnSync(
    process.execPath,
    ['.house-scanner-build/collector.mjs', '--print-policy-sql', ...args],
    { encoding: 'utf8' },
  );

it('prints the SQL that approves the Boneo policy without any network or file access', () => {
  const result = runPrinter('--source=boneo', `--household=${HOUSEHOLD}`);
  expect(result.status).toBe(0);
  const match =
    /^select hs\.admin_set_source_policy\('([^']+)', '(.*)'::jsonb\);\n$/s.exec(
      result.stdout,
    );
  expect(match?.[1]).toBe(HOUSEHOLD);
  const policy = JSON.parse((match?.[2] ?? '').replaceAll("''", "'"));
  expect(policy).toMatchObject({
    sourceId: 'boneo',
    status: 'approved',
    automatedCollection: true,
    privateDisplay: true,
    imageDisplay: false,
    imageHotlink: false,
  });
  expect(Date.parse(policy.reviewedAt)).toBeLessThan(Date.now());
  expect(Date.parse(policy.reviewDueAt)).toBeGreaterThan(Date.now());
});

it.each([
  [['--source=boneo']],
  [['--source=boneo', '--household=not-a-uuid']],
  [['--source=bjurfors', `--household=${HOUSEHOLD}`]],
])('refuses to print policy SQL for %j', (args) => {
  const result = runPrinter(...args);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
});
