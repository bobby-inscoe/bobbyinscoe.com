import { RouterProvider } from '@tanstack/react-router';
import type React from 'react';

import { router } from '@/app/router';

export function App(): React.JSX.Element {
  return <RouterProvider router={router} />;
}
