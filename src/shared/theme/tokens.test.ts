import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
 * Tier-two design-contract tests. These turn the rules in
 * prompts/ink-and-fibre-spec.html into build failures instead of things a
 * model is trusted to remember: every token declared in both schemes, and
 * every text/wash pairing clearing its assigned WCAG floor.
 *
 * Contrast here is computed flat, without the grain layer composited. The
 * spec measures every published contrast figure with grain included, but
 * gives no literal model for the noise texture (average luminance, blend
 * mode), so replicating that exactly would be inventing a value rather than
 * transcribing one. Semi-transparent noise can only pull two colours toward
 * each other, so flat contrast is always >= the true grain-composited
 * figure; a token that clears its floor here is guaranteed to clear it with
 * grain too. It cannot catch a token that only fails once grain is added.
 */

const cssPath = join(dirname(fileURLToPath(import.meta.url)), 'tokens.css');
const css = readFileSync(cssPath, 'utf-8');

function extractBraceBody(source: string, selectorPattern: RegExp): string {
  const match = selectorPattern.exec(source);
  if (!match) {
    throw new Error(`selector not found: ${selectorPattern}`);
  }
  const braceStart = source.indexOf('{', match.index);
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(braceStart + 1, i);
    }
  }
  throw new Error(`unbalanced braces for selector: ${selectorPattern}`);
}

function parseDeclarations(block: string): Map<string, string> {
  const declarations = new Map<string, string>();
  const re = /--site-([a-z0-9-]+):\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex-exec-in-loop idiom
  while ((match = re.exec(block))) {
    declarations.set(match[1], match[2].trim());
  }
  return declarations;
}

const lightBlock = extractBraceBody(css, /:root\s*\{/);
const darkMediaBlock = extractBraceBody(
  css,
  /:root:not\(\[data-theme="light"]\)\s*\{/,
);
const darkAttrBlock = extractBraceBody(css, /:root\[data-theme="dark"]\s*\{/);

const light = parseDeclarations(lightBlock);
const darkMedia = parseDeclarations(darkMediaBlock);
const darkAttr = parseDeclarations(darkAttrBlock);

const COLOR_TOKENS = [
  'ground',
  'raised',
  'surface',
  'surface-hover',
  'surface-active',
  'line-faint',
  'line',
  'line-strong',
  'mark-muted',
  'mark-secondary',
  'mark',
  'accent',
  'accent-strong',
  'accent-wash',
  'state',
  'state-wash',
  'error',
  'warning',
  'success',
  'grain',
];

describe('tokens declared in every scheme', () => {
  it('declares every colour token in the bare :root', () => {
    for (const name of COLOR_TOKENS) {
      expect(light.has(name), `--site-${name} missing from :root`).toBe(true);
    }
  });

  it('redeclares the identical set of colour tokens for prefers-color-scheme: dark', () => {
    const lightNames = new Set(COLOR_TOKENS);
    expect(new Set(darkMedia.keys())).toEqual(lightNames);
  });

  it('redeclares the identical set of colour tokens for [data-theme="dark"]', () => {
    const lightNames = new Set(COLOR_TOKENS);
    expect(new Set(darkAttr.keys())).toEqual(lightNames);
  });

  it('keeps the two dark declarations in sync with each other', () => {
    expect(Object.fromEntries(darkAttr)).toEqual(Object.fromEntries(darkMedia));
  });
});

describe('structural token groups have exactly the members the spec lists', () => {
  const cases: Array<[string, string[]]> = [
    [
      'space',
      ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'],
    ],
    ['radius', ['none', 'control', 'round']],
    ['duration', ['instant', 'quick', 'base', 'page', 'ambient']],
    ['ease', ['enter', 'exit']],
    ['breakpoint', ['480', '640', '900', '1200', '1600']],
    [
      'layer',
      ['ambient', 'base', 'raised', 'sticky', 'popover', 'modal', 'toast'],
    ],
  ];

  it.each(cases)(
    '%s has exactly its spec-listed members, no more',
    (group, members) => {
      const expected = new Set(members.map((m) => `${group}-${m}`));
      const actual = new Set(
        [...light.keys()].filter((k) => k.startsWith(`${group}-`)),
      );
      expect(actual).toEqual(expected);
    },
  );
});

// -- colour math: sRGB -> relative luminance -> WCAG contrast and CIE L* --

function hexToLinearChannels(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = Number.parseInt(clean.slice(0, 2), 16) / 255;
  const g = Number.parseInt(clean.slice(2, 4), 16) / 255;
  const b = Number.parseInt(clean.slice(4, 6), 16) / 255;
  const linearize = (c: number) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return [linearize(r), linearize(g), linearize(b)];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToLinearChannels(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

function lStar(hex: string): number {
  const y = relativeLuminance(hex);
  return y <= 0.008856 ? 903.3 * y : 116 * y ** (1 / 3) - 16;
}

const RAMPS: string[][] = [
  ['ground', 'raised', 'surface', 'surface-hover', 'surface-active'],
  ['line-faint', 'line', 'line-strong'],
  ['mark-muted', 'mark-secondary', 'mark'],
];

describe.each([
  ['light', light],
  ['dark', darkAttr],
])(
  '%s scheme neutrals: adjacent ramp steps clear delta-L* 3',
  (_scheme, tokens) => {
    for (const ramp of RAMPS) {
      for (let i = 0; i < ramp.length - 1; i++) {
        const a = ramp[i];
        const b = ramp[i + 1];
        it(`${a} vs ${b}`, () => {
          const hexA = tokens.get(a);
          const hexB = tokens.get(b);
          if (!hexA || !hexB) throw new Error(`missing token: ${a} or ${b}`);
          const delta = Math.abs(lStar(hexA) - lStar(hexB));
          expect(delta).toBeGreaterThanOrEqual(3);
        });
      }
    }
  },
);

const CONTRAST_FLOORS: Record<string, number> = {
  mark: 7,
  'mark-secondary': 5.5,
  accent: 6.5,
  'accent-strong': 8.5,
  'mark-muted': 4.5,
  state: 4.5,
  error: 4.5,
  warning: 4.5,
  success: 4.5,
};

const REFERENCE_BACKGROUND: Record<'light' | 'dark', string> = {
  light: 'ground',
  dark: 'surface',
};

describe.each([
  ['light', light],
  ['dark', darkAttr],
] as const)(
  '%s scheme: text tokens clear their assigned contrast floor',
  (scheme, tokens) => {
    const background = tokens.get(REFERENCE_BACKGROUND[scheme]);
    if (!background)
      throw new Error(`missing reference background for ${scheme}`);

    for (const [role, floor] of Object.entries(CONTRAST_FLOORS)) {
      it(`${role} clears ${floor}:1 against ${REFERENCE_BACKGROUND[scheme]}`, () => {
        const hex = tokens.get(role);
        if (!hex) throw new Error(`missing token: ${role}`);
        expect(contrastRatio(hex, background)).toBeGreaterThanOrEqual(floor);
      });
    }
  },
);

describe.each([
  ['light', light],
  ['dark', darkAttr],
] as const)(
  '%s scheme: wash surfaces clear a high floor for mark text',
  (_scheme, tokens) => {
    const mark = tokens.get('mark');
    if (!mark) throw new Error('missing token: mark');

    for (const wash of ['accent-wash', 'state-wash']) {
      it(`mark on ${wash} clears 9:1`, () => {
        const hex = tokens.get(wash);
        if (!hex) throw new Error(`missing token: ${wash}`);
        expect(contrastRatio(mark, hex)).toBeGreaterThanOrEqual(9);
      });
    }
  },
);
