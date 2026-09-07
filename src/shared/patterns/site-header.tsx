import { Link } from '@tanstack/react-router';
import type React from 'react';

import classes from '@/shared/patterns/site-header.module.css';

export function SiteHeader(): React.JSX.Element {
  return (
    <header className={classes.header}>
      <Link className={classes.link} to="/">
        Bobby Inscoe
      </Link>
      <nav aria-label="Primary" className={classes.nav}>
        <Link className={classes.link} to="/projects">
          Projects
        </Link>
      </nav>
    </header>
  );
}
