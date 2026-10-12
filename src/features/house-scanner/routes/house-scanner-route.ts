import {
  type AnyRoute,
  createRoute,
  lazyRouteComponent,
} from '@tanstack/react-router';

export function createHouseScannerRoute<TParent extends AnyRoute>(
  parentRoute: TParent,
) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: 'projects/house-scanner',
    component: lazyRouteComponent(
      () => import('@/features/house-scanner/components/house-scanner-page'),
      'HouseScannerPage',
    ),
  });
}
