import { type AnyRoute, createRoute } from '@tanstack/react-router';

import { ProjectsIndex } from '@/features/projects/components/projects-index';

export function createProjectsIndexRoute<TParent extends AnyRoute>(
  parentRoute: TParent,
) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/',
    component: ProjectsIndex,
  });
}
