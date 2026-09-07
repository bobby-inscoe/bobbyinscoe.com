import type { ProjectRecord } from '@/shared/projects/types';

/*
 * This file describes features but must never import one. It holds data and
 * route paths as string literals, nothing else. Do not invert this by having
 * each feature export a meta.ts that shared/ reads.
 *
 * One entry, deliberately. Which in-progress entries exist is a human
 * decision; do not invent projects to make the collection look fuller.
 */
export const PROJECTS: readonly ProjectRecord[] = [
  {
    id: 'duck-feed',
    title: 'Duck Feed',
    blurb:
      'A timed catching game. Steer a duck, eat the wheat, avoid the rest.',
    year: 2026,
    kind: 'Game',
    tags: ['game', 'canvas-free', 'browser'],
    status: 'live',
    presentation: 'plate',
    mode: 'application',
    route: '/projects/duck-feed',
    accent: null,
    accentLight: null,
  },
];
