import type React from 'react';

import classes from '@/shared/ui/rule.module.css';

/*
 * A hairline. Takes nothing: the weight and the colour are the only ones
 * the system has for a separator.
 */
export function Rule(): React.JSX.Element {
  return <hr className={classes.rule} />;
}
