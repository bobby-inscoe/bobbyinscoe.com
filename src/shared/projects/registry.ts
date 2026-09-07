import type { ProjectRecord } from '@/shared/projects/types';

/*
 * This file describes features but must never import one. It holds data and
 * route paths as string literals, nothing else. Do not invert this by having
 * each feature export a meta.ts that shared/ reads.
 *
 * Which in-progress entries exist is a human decision; do not invent projects
 * to make the collection look fuller. The two below were supplied by Bobby.
 * They are ideas with no code behind them yet, which is exactly what an
 * in-progress entry with a null route is for: the collection lists them and
 * renders the title as a paragraph rather than a link.
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
  {
    id: 'beer-map',
    title: 'BeerMap',
    blurb:
      'A map of the bars in Gothenburg. Find one nearby, and see what it charges for a beer.',
    year: 2026,
    kind: 'Map',
    tags: ['map', 'browser'],
    status: 'in-progress',
    presentation: 'text',
    route: null,
  },
  {
    id: 'shared-grocery-list',
    title: 'Shared grocery list',
    blurb:
      'A grocery list several people edit at once. Staples like bread and toilet paper stay on the list between shops, and each household sets its own.',
    year: 2026,
    kind: 'Tool',
    tags: ['tool', 'browser'],
    status: 'in-progress',
    presentation: 'text',
    route: null,
  },
];
