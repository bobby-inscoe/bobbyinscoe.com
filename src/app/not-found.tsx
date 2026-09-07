import { Link } from '@tanstack/react-router';
import type React from 'react';

import classes from '@/app/not-found.module.css';
import { Prose } from '@/shared/ui/prose';

/*
 * No phase in the spec claims this route, so before it existed an unknown
 * URL rendered the router's own bare paragraph inside the shell: no heading,
 * no way back except the header. It is user-facing, so it is set on the type
 * scale like any other page and nothing more than that.
 */
export function NotFound(): React.JSX.Element {
  return (
    <div className={classes.page}>
      <h1 className={classes.title}>Not found</h1>
      <Prose>
        <p>
          There is nothing at this address. The <Link to="/">collection</Link>{' '}
          is the place to start.
        </p>
      </Prose>
    </div>
  );
}
