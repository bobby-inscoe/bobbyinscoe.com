import { useDisclosure } from '@mantine/hooks';
import type React from 'react';

import { Colophon } from '@/shared/patterns/colophon';
import classes from '@/shared/patterns/site-footer.module.css';

/*
 * The colophon opens from here as a modal. It has no route, so the control
 * is a button rather than a link, and it says so to assistive technology.
 */
export function SiteFooter(): React.JSX.Element {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <footer className={classes.footer}>
      <small className={classes.wordmark}>Bobby Inscoe</small>
      <button
        aria-haspopup="dialog"
        className={classes.colophonButton}
        onClick={open}
        type="button"
      >
        Colophon
      </button>
      <Colophon onClose={close} opened={opened} />
    </footer>
  );
}
