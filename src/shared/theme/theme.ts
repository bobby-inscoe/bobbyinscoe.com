import type { CSSVariablesResolver } from '@mantine/core';
import { createTheme } from '@mantine/core';

declare module '@mantine/core' {
  export interface MantineThemeSizesOverride {
    radius: {
      none: string;
      control: string;
      round: string;
    };
  }
}

const fontDisplay =
  "'Bricolage Grotesque Variable', 'Helvetica Neue', Arial, sans-serif";
const fontMono =
  "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Consolas, monospace";

/*
 * Mantine's semantic colour variables (body, text, anchor, and so on) are
 * scheme-dependent in Mantine's own default resolver, so an override has to
 * land in both the `light` and `dark` buckets to win the merge in either
 * scheme. The values are identical in both buckets because --site-* already
 * resolves to the right colour for the active scheme; Mantine's own
 * light/dark split is redundant on top of that.
 */
const semanticColorVariables = {
  '--mantine-color-body': 'var(--site-ground)',
  '--mantine-color-text': 'var(--site-mark)',
  '--mantine-color-bright': 'var(--site-mark)',
  '--mantine-color-dimmed': 'var(--site-mark-muted)',
  '--mantine-color-anchor': 'var(--site-accent)',
  '--mantine-color-default': 'var(--site-surface)',
  '--mantine-color-default-hover': 'var(--site-surface-hover)',
  '--mantine-color-default-color': 'var(--site-mark)',
  '--mantine-color-default-border': 'var(--site-line)',
  '--mantine-color-placeholder': 'var(--site-mark-muted)',
  '--mantine-color-disabled': 'var(--site-surface-active)',
  '--mantine-color-disabled-color': 'var(--site-mark-muted)',
  '--mantine-color-disabled-border': 'var(--site-line-faint)',
  '--mantine-color-error': 'var(--site-error)',
  '--mantine-color-success': 'var(--site-success)',
};

/*
 * Mantine's `theme` prop and `cssVariablesResolver` prop are separate
 * MantineProvider inputs; createTheme's return type has no slot for the
 * resolver. Both are exported here so the provider can be wired to
 * `theme` and `cssVariablesResolver` together in one place.
 */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: semanticColorVariables,
  dark: semanticColorVariables,
});

export const theme = createTheme({
  fontFamily: fontDisplay,
  fontFamilyMonospace: fontMono,
  headings: {
    fontFamily: fontDisplay,
  },
  defaultRadius: 'control',
  radius: {
    none: 'var(--site-radius-none)',
    control: 'var(--site-radius-control)',
    round: 'var(--site-radius-round)',
  },
});
