import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Outlet } from '@tanstack/react-router';
import type React from 'react';

import classes from '@/app/app-shell.module.css';
import { SiteFooter } from '@/shared/patterns/site-footer';
import { SiteHeader } from '@/shared/patterns/site-header';
import { cssVariablesResolver, theme } from '@/shared/theme/theme';

const MAIN_ID = 'main-content';

export function AppShell(): React.JSX.Element {
  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <ColorSchemeScript defaultColorScheme="auto" />
      <div className={classes.shell}>
        <a className={classes.skipLink} href={`#${MAIN_ID}`}>
          Skip to content
        </a>
        <div aria-hidden="true" className={classes.ambient} />
        <SiteHeader />
        <main className={classes.main} id={MAIN_ID}>
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </MantineProvider>
  );
}
