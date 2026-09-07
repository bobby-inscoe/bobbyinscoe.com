import type React from 'react';

import classes from '@/shared/ui/meta.module.css';

export interface MetaProps {
  children: React.ReactNode;
}

/*
 * The `meta` role: mono, 11px, tracked and uppercased, in the muted tier.
 * That tier clears 4.5:1 at this size with nothing to spare, which is why
 * the size and the colour are both fixed here rather than passed in.
 */
export function Meta({ children }: MetaProps): React.JSX.Element {
  return <p className={classes.meta}>{children}</p>;
}
