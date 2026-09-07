import type React from 'react';

import classes from '@/shared/patterns/site-footer.module.css';

/*
 * Phase 4 adds the colophon link here; it opens a Mantine Modal, not a route.
 */
export function SiteFooter(): React.JSX.Element {
  return (
    <footer className={classes.footer}>
      <small>Bobby Inscoe</small>
    </footer>
  );
}
