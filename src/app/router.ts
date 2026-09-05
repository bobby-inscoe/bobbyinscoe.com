import { createRootRoute, createRouter } from '@tanstack/react-router';

import { AppShell } from '@/app/app-shell';
import { createDuckFeedRouteTree } from '@/features/duck-feed/routes/route-tree';

const rootRoute = createRootRoute({
  component: AppShell,
});

const routeTree = rootRoute.addChildren([createDuckFeedRouteTree(rootRoute)]);

export const router = createRouter({
  routeTree,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
