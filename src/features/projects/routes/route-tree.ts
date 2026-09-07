import type { AnyRoute } from '@tanstack/react-router';

import { createDuckFeedRouteTree } from '@/features/projects/features/duck-feed/routes/route-tree';
import { createProjectsIndexRoute } from '@/features/projects/routes/projects-index-route';
import { createProjectsRoute } from '@/features/projects/routes/projects-route';

export function createProjectsRouteTree<TParent extends AnyRoute>(
  parentRoute: TParent,
) {
  const projectsRoute = createProjectsRoute(parentRoute);

  return projectsRoute.addChildren([
    createProjectsIndexRoute(projectsRoute),
    createDuckFeedRouteTree(projectsRoute),
  ]);
}
