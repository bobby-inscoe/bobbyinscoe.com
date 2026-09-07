import { describe, expect, it } from 'vitest';

import type {
  InProgressProject,
  LiveProject,
  ProjectRecord,
} from '@/shared/projects/types';

/*
 * Tier two: design contract. A discriminated union's real guarantee is at
 * the type level, not the runtime one, so the sharpest test is that the
 * invalid combinations fail to compile. @ts-expect-error itself fails
 * `npm run typecheck` if the line beneath it has no error, so its presence
 * compiling is the proof; the runtime assertions confirm the valid shapes
 * still narrow the way the union promises.
 */

describe('ProjectRecord discriminated union', () => {
  it('narrows a live project to its live-only fields', () => {
    const project: ProjectRecord = {
      id: 'plate-project',
      title: 'Plate Project',
      blurb: 'blurb',
      year: 2024,
      kind: 'Tool',
      tags: ['tool'],
      status: 'live',
      presentation: 'plate',
      mode: 'application',
      route: '/plate-project',
      accent: null,
      accentLight: null,
    };

    if (project.status !== 'live') throw new Error('expected a live project');
    expect(project.route).toBe('/plate-project');
    expect(project.mode).toBe('application');
  });

  it('narrows an in-progress project to a text presentation and nullable route', () => {
    const project: ProjectRecord = {
      id: 'idea',
      title: 'Idea',
      blurb: 'blurb',
      year: 2026,
      kind: 'Idea',
      tags: [],
      status: 'in-progress',
      presentation: 'text',
      route: null,
    };

    if (project.status !== 'in-progress') {
      throw new Error('expected an in-progress project');
    }
    expect(project.presentation).toBe('text');
    expect(project.route).toBeNull();
  });

  it('rejects an in-progress project with a non-text presentation at compile time', () => {
    function build(): InProgressProject {
      return {
        id: 'invalid',
        title: 'Invalid',
        blurb: '',
        year: 2026,
        kind: 'Idea',
        tags: [],
        status: 'in-progress',
        // @ts-expect-error presentation is locked to 'text' on an in-progress project
        presentation: 'plate',
        route: null,
      };
    }
    expect(build().status).toBe('in-progress');
  });

  it('rejects a live project missing its live-only fields at compile time', () => {
    function build(): LiveProject {
      // @ts-expect-error a live project also requires mode, route, accent, and accentLight
      return {
        id: 'invalid-live',
        title: 'Invalid',
        blurb: '',
        year: 2026,
        kind: 'Idea',
        tags: [],
        status: 'live',
        presentation: 'text',
      };
    }
    expect(build().status).toBe('live');
  });
});
