import type { CSSVariablesResolver } from '@mantine/core';
import { createTheme, Modal } from '@mantine/core';

declare module '@mantine/core' {
  export interface MantineThemeSizesOverride {
    radius: {
      none: string;
      control: string;
      round: string;
    };
  }
}

/*
 * The families themselves live in tokens.css alongside the type scale, so
 * there is one declaration of each rather than a string here and a copy
 * there that can drift.
 */
const fontDisplay = 'var(--site-font-display)';
const fontMono = 'var(--site-font-mono)';

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

  /*
   * Mantine's primary colour defaults to its own blue, which reaches the
   * page as the focus ring on every control. Point it at the accent so no
   * hue outside the palette can appear.
   */
  '--mantine-primary-color-filled': 'var(--site-accent)',
  '--mantine-primary-color-filled-hover': 'var(--site-accent-strong)',
  '--mantine-primary-color-light': 'var(--site-accent-wash)',
  '--mantine-primary-color-light-hover': 'var(--site-accent-wash)',
  '--mantine-primary-color-light-color': 'var(--site-accent)',
  '--mantine-primary-color-contrast': 'var(--site-ground)',
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

/*
 * Mantine sizes every component off `--mantine-font-size-*`, and its own
 * five-step scale is not ours. The site's scale has exactly two interface
 * sizes, so Mantine's five map onto those two: anything Mantine renders
 * lands on the scale without a style prop at the call site.
 */
const fontSizes = {
  xs: 'var(--site-type-ui-small-size)',
  sm: 'var(--site-type-ui-small-size)',
  md: 'var(--site-type-ui-size)',
  lg: 'var(--site-type-ui-size)',
  xl: 'var(--site-type-ui-size)',
};

export const theme = createTheme({
  fontFamily: fontDisplay,
  fontFamilyMonospace: fontMono,
  fontSizes,
  headings: {
    fontFamily: fontDisplay,
  },
  defaultRadius: 'control',
  radius: {
    none: 'var(--site-radius-none)',
    control: 'var(--site-radius-control)',
    round: 'var(--site-radius-round)',
  },
  components: {
    /*
     * Blur belongs only on an overlay backdrop, per the motion vocabulary.
     * The modal's own elevation is --site-shadow-overlay, applied in
     * colophon.module.css. It is deliberately not registered here in
     * Mantine's shadow scale and not passed through Modal's `shadow` prop:
     * there is one consumer, and a scale invites a second.
     */
    Modal: Modal.extend({
      defaultProps: {
        centered: true,
        overlayProps: { blur: 3 },
        transitionProps: { duration: 240, transition: 'fade' },
      },
    }),
  },
});
