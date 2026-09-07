import type { CSSVariablesResolver } from '@mantine/core';
import { createTheme, Input, InputWrapper, Modal, Select } from '@mantine/core';
import { ChevronDown } from 'lucide-react';
import { createElement } from 'react';

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
 * Mantine's component layer does not read the semantic variables above. Its
 * Input and Popover rules reach past them into the raw palette, so a themed
 * site still rendered stock controls: the archive's Selects computed a flat
 * neutral grey in dark and pure white in light, neither of which is a token
 * and neither of which a scan over src/ can see, because the literals live
 * in Mantine's own stylesheet.
 *
 * These five palette entries are the ones those rules name. Overriding them
 * here rather than per component means a control added later inherits the
 * token layer instead of having to be remembered. They are declared in both
 * scheme buckets because each value is a --site-* variable that already
 * resolves correctly for the active scheme.
 *
 * --popover-shadow has no palette source and Mantine never declares it, only
 * consumes it with a `none` fallback, so it can be set here and inherit.
 */
const componentColorVariables = {
  '--mantine-color-white': 'var(--site-surface)',
  '--mantine-color-black': 'var(--site-mark)',
  '--mantine-color-gray-2': 'var(--site-line)',
  '--mantine-color-gray-4': 'var(--site-line)',
  '--mantine-color-dark-4': 'var(--site-line)',
  '--mantine-color-dark-6': 'var(--site-surface)',

  /* A dropdown is a popover, and the overlay shadow is what popovers get. */
  '--popover-shadow': 'var(--site-shadow-overlay)',
};

/*
 * Mantine's `theme` prop and `cssVariablesResolver` prop are separate
 * MantineProvider inputs; createTheme's return type has no slot for the
 * resolver. Both are exported here so the provider can be wired to
 * `theme` and `cssVariablesResolver` together in one place.
 */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: { ...semanticColorVariables, ...componentColorVariables },
  dark: { ...semanticColorVariables, ...componentColorVariables },
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

    /*
     * Mantine sets the control's font weight itself, so mapping the font
     * sizes above is not enough: the label rendered 13px/600 and the input
     * 13px/400, and the scale has neither. Both belong to the ui-small role,
     * which is 500. The `font` shorthand resets the other font longhands, so
     * it carries the family and the line height with it.
     */
    Input: Input.extend({
      styles: {
        input: { font: 'var(--site-type-ui-small)' },
        section: { color: 'var(--site-mark-muted)' },
      },
    }),
    /*
     * The label belongs to InputWrapper, not to InputLabel: the rendered
     * element carries mantine-InputWrapper-label, so a theme entry keyed to
     * InputLabel is silently ignored. Keyed here it reaches every Mantine
     * control's label rather than only the Select's.
     */
    InputWrapper: InputWrapper.extend({
      styles: { label: { font: 'var(--site-type-ui-small)' } },
    }),

    /*
     * The chevron is Mantine's own inline SVG, which is a second icon set on
     * a site whose only icon set is lucide. Replaced here rather than at the
     * three call sites so a fourth Select inherits it. createElement rather
     * than JSX because the spec's file tree names this file theme.ts and a
     * rename is not ours to make.
     */
    Select: Select.extend({
      defaultProps: {
        rightSection: createElement(ChevronDown, {
          'aria-hidden': true,
          size: 14,
        }),
        rightSectionPointerEvents: 'none',
      },
      styles: { option: { font: 'var(--site-type-ui-small)' } },
    }),
  },
});
