import { createRootRoute, createRouter } from '@tanstack/react-router';

import { AppShell } from '@/app/app-shell';
import { createHomeRouteTree } from '@/features/home/routes/route-tree';
import { createProjectsRouteTree } from '@/features/projects/routes/route-tree';

const rootRoute = createRootRoute({
  component: AppShell,
});

export const routeTree = rootRoute.addChildren([
  createHomeRouteTree(rootRoute),
  createProjectsRouteTree(rootRoute),
]);

export const router = createRouter({
  routeTree,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
