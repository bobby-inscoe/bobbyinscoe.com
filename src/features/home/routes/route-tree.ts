import type { AnyRoute } from '@tanstack/react-router';

import { createHomeRoute } from '@/features/home/routes/home-route';

export function createHomeRouteTree<TParent extends AnyRoute>(
  parentRoute: TParent,
) {
  return createHomeRoute(parentRoute);
}
