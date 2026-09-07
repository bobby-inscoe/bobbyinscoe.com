import { type AnyRoute, createRoute } from '@tanstack/react-router';

import { HomePage } from '@/features/home/components/home-page';

export function createHomeRoute<TParent extends AnyRoute>(
  parentRoute: TParent,
) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/',
    component: HomePage,
  });
}
