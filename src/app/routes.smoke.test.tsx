import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '@/app/router';
import { PROJECTS } from '@/shared/projects/registry';

/*
 * Tier three: render smoke. Each route renders, the skip link is present,
 * there is exactly one main landmark, and nothing writes to console.error.
 *
 * This file is cumulative. Every phase that adds a route adds its case here
 * rather than starting a second smoke file.
 */

const ROUTES = [
  { path: '/', heading: 'Bobby Inscoe' },
  { path: '/projects', heading: 'Projects' },
  { path: '/projects/duck-feed', heading: 'Feed the Duck!' },
  { path: '/no-such-page', heading: 'Not found' },
] as const;

async function renderRoute(path: string): Promise<void> {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );

  render(<RouterProvider router={router} />);
  await screen.findByRole('main');
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  consoleError.mockRestore();
});

describe.each(ROUTES)('$path', ({ path, heading }) => {
  it('renders its own heading', async () => {
    await renderRoute(path);
    expect(
      screen.getByRole('heading', { level: 1, name: heading }),
    ).toBeDefined();
  });

  it('renders exactly one main landmark', async () => {
    await renderRoute(path);
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('renders a skip link targeting that main landmark', async () => {
    await renderRoute(path);
    const main = screen.getByRole('main');
    const skipLink = screen.getByRole('link', { name: /skip to content/i });

    expect(main.id).not.toBe('');
    expect(skipLink.getAttribute('href')).toBe(`#${main.id}`);
  });

  it('renders without a console error', async () => {
    await renderRoute(path);
    expect(consoleError).not.toHaveBeenCalled();
  });
});

/*
 * The thread is decoration hung on the collection, so what tier three can say
 * about it is where it is and that it is hidden from assistive technology.
 * Its geometry is tier one, in thread-path.test.ts: jsdom reports every rect
 * as zero, so nothing here would be measuring a real layout.
 */
describe('the thread', () => {
  it('is mounted on the collection and hidden from assistive technology', async () => {
    await renderRoute('/');
    const strand = document.querySelector('[data-thread="strand"]');

    expect(strand).not.toBeNull();
    expect(strand?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('is not on the archive, which is a table and not a collection', async () => {
    await renderRoute('/projects');
    expect(document.querySelector('[data-thread="strand"]')).toBeNull();
  });

  it('leaves every entry title reachable without it', async () => {
    await renderRoute('/');
    for (const project of PROJECTS) {
      expect(
        screen.getByRole('heading', { level: 3, name: project.title }),
      ).toBeDefined();
    }
  });
});
