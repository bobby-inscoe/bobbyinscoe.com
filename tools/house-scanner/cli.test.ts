import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { beforeAll, expect, it } from 'vitest';

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
