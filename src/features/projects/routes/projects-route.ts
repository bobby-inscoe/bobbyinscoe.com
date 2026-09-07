import { type AnyRoute, createRoute } from '@tanstack/react-router';

/*
 * A layout route with no component of its own, so TanStack renders its
 * Outlet directly. Path nesting is component nesting: giving this route the
 * archive component would render every project page inside the archive.
 * The page at exactly /projects is projects-index-route.ts.
 */
export function createProjectsRoute<TParent extends AnyRoute>(
  parentRoute: TParent,
) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: 'projects',
  });
}
