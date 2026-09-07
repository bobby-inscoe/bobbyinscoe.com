import type { AnyRoute } from '@tanstack/react-router';

import { createDuckFeedRoute } from '@/features/projects/features/duck-feed/routes/duck-feed-route';

export function createDuckFeedRouteTree<TParent extends AnyRoute>(
  parentRoute: TParent,
) {
  return createDuckFeedRoute(parentRoute);
}
