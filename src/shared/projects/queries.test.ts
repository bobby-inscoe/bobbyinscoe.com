import { describe, expect, it } from 'vitest';

import {
  byStatus,
  byTag,
  byYear,
  liveProjects,
} from '@/shared/projects/queries';
import type { ProjectRecord } from '@/shared/projects/types';

/*
 * Tier one: pure logic. These pass a fixture array explicitly rather than
 * relying on the real registry, so the test doesn't change shape as
 * projects are added or removed from it.
 */

const FIXTURE: readonly ProjectRecord[] = [
  {
    id: 'a',
    title: 'A',
    blurb: 'a blurb',
    year: 2024,
    kind: 'Game',
    tags: ['game', 'browser'],
    status: 'live',
    presentation: 'plate',
    mode: 'application',
    route: '/projects/a',
    accent: null,
    accentLight: null,
  },
  {
    id: 'b',
    title: 'B',
    blurb: 'b blurb',
    year: 2025,
    kind: 'Tool',
    tags: ['tool', 'browser'],
    status: 'live',
    presentation: 'text',
    mode: 'document',
    route: '/projects/b',
    accent: null,
    accentLight: null,
  },
  {
    id: 'c',
    title: 'C',
    blurb: 'c blurb',
    year: 2025,
    kind: 'Idea',
    tags: ['idea'],
    status: 'in-progress',
    presentation: 'text',
    route: null,
  },
];

describe('liveProjects', () => {
  it('returns only entries with status live', () => {
    expect(liveProjects(FIXTURE).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('returns an empty array when nothing is live', () => {
    const [, , inProgressOnly] = FIXTURE;
    expect(liveProjects([inProgressOnly])).toEqual([]);
  });
});

describe('byTag', () => {
  it('returns entries carrying the given tag', () => {
    expect(byTag('browser', FIXTURE).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('returns an empty array for a tag nothing carries', () => {
    expect(byTag('nonexistent', FIXTURE)).toEqual([]);
  });
});

describe('byYear', () => {
  it('returns entries matching the given year', () => {
    expect(byYear(2025, FIXTURE).map((p) => p.id)).toEqual(['b', 'c']);
  });

  it('returns an empty array for a year with no entries', () => {
    expect(byYear(1999, FIXTURE)).toEqual([]);
  });
});

describe('byStatus', () => {
  it('returns entries matching the given status', () => {
    expect(byStatus('in-progress', FIXTURE).map((p) => p.id)).toEqual(['c']);
  });

  it('composes with byTag, since both take a projects array', () => {
    const browserAndLive = byStatus('live', byTag('browser', FIXTURE));
    expect(browserAndLive.map((p) => p.id)).toEqual(['a', 'b']);
  });
});
