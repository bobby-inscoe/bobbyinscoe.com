import type { AnyRoute } from '@tanstack/react-router';

import { createHouseScannerRoute } from '@/features/house-scanner/routes/house-scanner-route';

export function createHouseScannerRouteTree<TParent extends AnyRoute>(
  parentRoute: TParent,
) {
  return createHouseScannerRoute(parentRoute);
}
