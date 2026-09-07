import type React from 'react';

import classes from '@/shared/ui/plate.module.css';

export interface PlateProps {
  children: React.ReactNode;
}

/*
 * A raised surface. One treatment, no variants: the elevation ramp has a
 * single step above the ground for content, and a plate that could be
 * sized or tinted would be a second design system.
 */
export function Plate({ children }: PlateProps): React.JSX.Element {
  return <div className={classes.plate}>{children}</div>;
}
