import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ProjectEntry } from '@/shared/patterns/project-entry';
import type { ProjectRecord } from '@/shared/projects/types';

/*
 * Tier three: render smoke for the two entry rules that no other test
 * reaches, and that the registry cannot exercise because it holds one live
 * project. Placeholder entries were briefly added to the registry to make
 * these visible in a browser; that was the wrong place for them. Which
 * in-progress entries exist is the human's call and registry content is real
 * work only, so the coverage lives here on a fixture instead.
 *
 * Fixture rather than PROJECTS, like queries.test.ts, so these do not change
 * shape as real projects arrive.
 */

const IN_PROGRESS_NO_ROUTE: ProjectRecord = {
  id: 'no-route',
  title: 'Without A Route',
  blurb: 'an in-progress entry that has no page yet',
  year: 2025,
  kind: 'Idea',
  tags: ['idea'],
  status: 'in-progress',
  presentation: 'text',
  route: null,
};

const IN_PROGRESS_WITH_ROUTE: ProjectRecord = {
  ...IN_PROGRESS_NO_ROUTE,
  id: 'with-route',
  title: 'With A Route',
  route: '/projects/duck-feed',
};

const LIVE: ProjectRecord = {
  id: 'live',
  title: 'A Live One',
  blurb: 'a finished project',
  year: 2026,
  kind: 'Game',
  tags: ['game'],
  status: 'live',
  presentation: 'plate',
  mode: 'application',
  route: '/projects/duck-feed',
  accent: null,
  accentLight: null,
};

/*
 * ProjectEntry renders a Link, which needs a router in context. A root route
 * carrying the fixture is the smallest thing that provides one.
 */
async function renderEntry(project: ProjectRecord): Promise<void> {
  const rootRoute = createRootRoute({
    component: () => (
      <ol>
        <ProjectEntry anchorRef={null} index={1} project={project} />
      </ol>
    ),
  });

  render(
    <RouterProvider
      router={createRouter({
        routeTree: rootRoute,
        history: createMemoryHistory({ initialEntries: ['/'] }),
      })}
    />,
  );

  // TanStack mounts asynchronously; without this the assertions race an
  // empty container and every case fails for the wrong reason.
  await screen.findByRole('list');
}

afterEach(cleanup);

describe('an in-progress entry with a null route', () => {
  it('renders its title as text rather than a link', async () => {
    await renderEntry(IN_PROGRESS_NO_ROUTE);

    expect(screen.getByText('Without A Route')).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Without A Route' })).toBeNull();
  });

  it('still renders a hollow node and says its status in words', async () => {
    await renderEntry(IN_PROGRESS_NO_ROUTE);

    expect(document.querySelector('[data-hollow="true"]')).not.toBeNull();
    expect(screen.getByText(/in progress/i)).toBeDefined();
  });
});

describe('an in-progress entry that does have a route', () => {
  it('renders its title as a link, so the null case is the branch and not the rule', async () => {
    await renderEntry(IN_PROGRESS_WITH_ROUTE);

    expect(screen.getByRole('link', { name: 'With A Route' })).toBeDefined();
    expect(document.querySelector('[data-hollow="true"]')).not.toBeNull();
  });
});

describe('a live entry', () => {
  it('renders a filled node and links to its page', async () => {
    await renderEntry(LIVE);

    expect(screen.getByRole('link', { name: 'A Live One' })).toBeDefined();
    expect(document.querySelector('[data-hollow="false"]')).not.toBeNull();
    expect(document.querySelector('[data-hollow="true"]')).toBeNull();
  });
});
