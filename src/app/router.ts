import type { RouterHistory } from '@tanstack/react-router';
import { createRootRoute, createRouter } from '@tanstack/react-router';

import { AppShell } from '@/app/app-shell';
import { NotFound } from '@/app/not-found';
import { createHomeRouteTree } from '@/features/home/routes/route-tree';
import { createProjectsRouteTree } from '@/features/projects/routes/route-tree';

const rootRoute = createRootRoute({
  component: AppShell,
});

export const routeTree = rootRoute.addChildren([
  createHomeRouteTree(rootRoute),
  createProjectsRouteTree(rootRoute),
]);

/*
 * One place that knows the router's configuration. The render-smoke tests
 * mount the real tree on a memory history and would otherwise rebuild that
 * configuration themselves, which is how a test ends up asserting against a
 * router the application does not actually ship.
 */
export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    defaultNotFoundComponent: NotFound,
    /*
     * Set here rather than per Link so every route change transitions the same
     * way, including the browser's back button and the project frame's own
     * back link, which no Link prop would reach. The router feature-detects
     * document.startViewTransition, so a browser without it navigates plainly.
     */
    defaultViewTransition: true,
    ...(history ? { history } : {}),
  });
}

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
