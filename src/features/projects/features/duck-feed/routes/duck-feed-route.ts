import { type AnyRoute, createRoute } from '@tanstack/react-router';

import { DuckFeed } from '@/features/projects/features/duck-feed/components/duck-feed';

export function createDuckFeedRoute<TParent extends AnyRoute>(
  parentRoute: TParent,
) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: 'duck-feed',
    component: DuckFeed,
  });
}
