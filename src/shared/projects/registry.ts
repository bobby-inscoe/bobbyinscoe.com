import type { ProjectRecord } from '@/shared/projects/types';

/*
 * This file describes features but must never import one. It holds data and
 * route paths as string literals, nothing else. Do not invert this by having
 * each feature export a meta.ts that shared/ reads.
 *
 * Which in-progress entries really exist is a human decision, and it has not
 * been made. The three below are PLACEHOLDERS, added on instruction so that
 * phase 5 has more than one node to run a thread between and so the hollow
 * node, the null-route branch and the archive's filters are exercised
 * against real data. They are not Bobby's projects and they are not the
 * answer to that question.
 *
 * DO NOT SHIP THESE. They must be replaced with the real entries or removed
 * before anything reaches main. They are deliberately obvious rather than
 * plausible so that nobody mistakes them for content, and they are isolated
 * in their own commit so removing them is a revert.
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
    id: 'placeholder-one',
    title: 'Placeholder One',
    blurb: 'A placeholder entry. Not a real project.',
    year: 2025,
    kind: 'Placeholder',
    tags: ['placeholder'],
    status: 'in-progress',
    presentation: 'text',
    route: null,
  },
  {
    id: 'placeholder-two',
    title: 'Placeholder Two',
    blurb: 'A placeholder entry with a route, so both branches render.',
    year: 2025,
    kind: 'Placeholder',
    tags: ['placeholder', 'browser'],
    status: 'in-progress',
    presentation: 'text',
    route: '/projects/duck-feed',
  },
  {
    id: 'placeholder-three',
    title: 'Placeholder Three',
    blurb: 'A placeholder entry. Not a real project.',
    year: 2024,
    kind: 'Placeholder',
    tags: ['placeholder'],
    status: 'in-progress',
    presentation: 'text',
    route: null,
  },
];
