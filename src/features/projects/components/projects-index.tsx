import type React from 'react';

import classes from '@/features/projects/components/projects-index.module.css';

/*
 * The archive lives here: a dense table, filterable by tag, year and kind,
 * keyboard-navigable. Phase 3 builds it. Phase 2 owns the route only.
 */
export function ProjectsIndex(): React.JSX.Element {
  return (
    <div className={classes.page}>
      <h1>Projects</h1>
    </div>
  );
}
