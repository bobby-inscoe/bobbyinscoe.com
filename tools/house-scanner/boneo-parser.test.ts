import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertAdapterOutput } from '@house-scanner-tools/boneo-live';
import {
  parseBoneoNextData,
  readBoneoSearchPage,
} from '@house-scanner-tools/boneo-parser';
import {
  BONEO_ORIGIN,
  sourceRegistry,
} from '@house-scanner-tools/source-registry';
import { describe, expect, it } from 'vitest';

const observedAt = new Date('2026-10-13T09:00:00.000Z');
const fixture = (name: string) =>
  readFileSync(resolve('tools/house-scanner/fixtures/boneo', name), 'utf8');
const context = { origin: BONEO_ORIGIN, observedAt, receivedBefore: 0 };

function page(name = 'search-page.html') {
  const read = readBoneoSearchPage(fixture(name), context);
  if (read.kind !== 'page') throw new Error(`Fixture failed: ${read.reason}`);
  return read;
}
function byListing(id: number) {
  const found = page().observations.find(
    (observation) => observation.sourceListingId === String(9_000_000 + id),
  );
  if (!found) throw new Error(`Listing ${id} missing`);
  return found;
}

describe('Boneo parser', () => {
  it('maps a complete item without keeping the body, photo or evidence', () => {
    const observation = byListing(1);
    expect(observation).toMatchObject({
      sourceListingId: '9000001',
      episodeId: 'created:2026-09-30T08:00:00.000Z',
      sourceUrl: 'https://www.boneo.se/bostad/exempelgatan-1-fixture-1',
      title: 'Exempelgatan 1',
      observedAt: '2026-10-13T09:00:00.000Z',
      publishedAt: '2026-10-01T08:00:00.000Z',
      conflicts: [],
      evidence: [],
      photo: null,
      facts: {
        propertyType: 'apartment',
        tenure: 'cooperative',
        purchase: true,
        livingAreaM2: 51,
        secondaryAreaM2: null,
        rooms: 2,
        askingPriceSek: 3_001_000,
        municipality: 'Göteborg',
        baseFeeSek: 2501,
        status: 'available',
        groundFloor: null,
        lift: null,
        outdoor: null,
      },
    });
    expect(JSON.stringify(observation)).not.toContain('Syntetisk');
  });

  it('marks coordinates approximate and reads numeric strings', () => {
    expect(byListing(1).coordinates).toMatchObject({
      precision: 'approximate_area',
      source: 'boneo-search-data',
    });
    expect(byListing(2).coordinates).toMatchObject({
      longitude: 11.95,
      latitude: 57.71,
    });
  });

  it('keeps a missing price unknown, never zero', () => {
    expect(byListing(2).facts.askingPriceSek).toBeNull();
    expect(byListing(9).facts.askingPriceSek).toBeNull();
    expect(byListing(9).conflicts).toEqual([]);
  });

  it('preserves upcoming status and a null coordinate', () => {
    const observation = byListing(3);
    expect(observation.facts.status).toBe('upcoming');
    expect(observation.coordinates).toBeNull();
    expect(observation.facts.baseFeeSek).toBeNull();
  });

  it('does not call a non-active item available', () => {
    const observation = byListing(4);
    expect(observation.facts.status).toBe('unknown');
    expect(observation.conflicts).toEqual(['status']);
    expect(byListing(9).facts.status).toBe('sold');
  });

  it('reads only exact-case keys when keys differ by case', () => {
    const observation = byListing(5);
    expect(observation.sourceUrl).toBe(
      'https://www.boneo.se/bostad/exempelgatan-5-fixture-5',
    );
    expect(observation.facts.status).toBe('available');
    expect(observation.facts.secondaryAreaM2).toBe(4.5);
  });

  it('records a conflict when price fields or currency disagree', () => {
    for (const id of [6, 7]) {
      const observation = byListing(id);
      expect(observation.facts.askingPriceSek).toBeNull();
      expect(observation.conflicts).toEqual(['askingPriceSek']);
    }
  });

  it('skips a link outside the canonical origin and counts it', () => {
    const read = page();
    expect(read.itemCount).toBe(9);
    expect(read.skipped).toBe(1);
    expect(read.observations).toHaveLength(8);
    expect(
      read.observations.some((o) => o.sourceUrl.includes('example.invalid')),
    ).toBe(false);
  });

  it('produces output the source policy accepts', () => {
    const policy = sourceRegistry().find(
      (entry) => entry.policy.sourceId === 'boneo',
    )?.policy;
    if (!policy) throw new Error('boneo missing');
    for (const observation of page().observations)
      expect(() => assertAdapterOutput(policy, observation)).not.toThrow();
  });

  it('reports total and a more-pages signal from the embedded data', () => {
    const first = page('search-page-more.html');
    expect(first.total).toBe(7);
    expect(first.more).toEqual({ kind: 'more', remaining: 5 });
    const last = readBoneoSearchPage(fixture('search-page-more.html'), {
      ...context,
      receivedBefore: 5,
    });
    expect(last.kind === 'page' && last.more).toEqual({ kind: 'none' });
    expect(page().more).toEqual({ kind: 'none' });
  });

  it('does not assume completeness without a total or after an empty page', () => {
    const data = { props: { pageProps: { listData: { pData: [] } } } };
    expect(parseBoneoNextData(data, context)).toMatchObject({
      more: { kind: 'unknown', reason: 'no-total' },
    });
    const stalled = {
      props: { pageProps: { listData: { pData: [], count: 9 } } },
    };
    expect(parseBoneoNextData(stalled, context)).toMatchObject({
      more: { kind: 'unknown', reason: 'empty-page-before-total' },
    });
  });

  it('treats zero results as a page, not a failure', () => {
    expect(page('search-page-empty.html')).toMatchObject({
      total: 0,
      observations: [],
      more: { kind: 'none' },
    });
  });

  it('fails a page with no embedded data', () => {
    expect(readBoneoSearchPage(fixture('blocked-page.html'), context)).toEqual({
      kind: 'failed',
      reason: 'no-embedded-data',
    });
  });

  it.each([
    [
      'a non-object',
      '<script id="__NEXT_DATA__">"text"</script>',
      'invalid-embedded-data',
    ],
    [
      'broken JSON',
      '<script id="__NEXT_DATA__">{broken</script>',
      'invalid-embedded-data',
    ],
    [
      'a missing list',
      '<script id="__NEXT_DATA__">{"props":{"pageProps":{}}}</script>',
      'unexpected-shape',
    ],
    [
      'a count below the item count',
      '<script id="__NEXT_DATA__">{"props":{"pageProps":{"listData":{"pData":[{}],"count":0}}}}</script>',
      'inconsistent-count',
    ],
  ])('fails closed on %s', (_name, html, reason) => {
    expect(readBoneoSearchPage(html, context)).toEqual({
      kind: 'failed',
      reason,
    });
  });
});
