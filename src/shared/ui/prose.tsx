import type React from 'react';

import classes from '@/shared/ui/prose.module.css';

export interface ProseProps {
  children: React.ReactNode;
}

/*
 * Running prose: the `read` role at its measure, with the vertical rhythm
 * between blocks. Newsreader is prose only, so this is the only place the
 * face appears; never in UI chrome, on a button, or in metadata.
 */
export function Prose({ children }: ProseProps): React.JSX.Element {
  return <div className={classes.prose}>{children}</div>;
}
