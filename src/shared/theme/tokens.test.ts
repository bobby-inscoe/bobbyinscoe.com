import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
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
    // Multi-line values (shadow-overlay) carry the block's indentation, which
    // differs between the media block and the attribute block. Collapse it so
    // the two dark declarations compare on their content.
    declarations.set(match[1], match[2].trim().replace(/\s+/g, ' '));
  }
  return declarations;
}

const lightBlock = extractBraceBody(css, /:root\s*\{/);
const darkMediaBlock = extractBraceBody(
  css,
  /:root:not\(\[data-mantine-color-scheme="light"]\)\s*\{/,
);
const darkAttrBlock = extractBraceBody(
  css,
  /:root\[data-mantine-color-scheme="dark"]\s*\{/,
);

const light = parseDeclarations(lightBlock);
const darkMedia = parseDeclarations(darkMediaBlock);
const darkAttr = parseDeclarations(darkAttrBlock);

/*
 * Every token whose value changes with the colour scheme, so every one of
 * them must be declared in all three blocks. Not all are colours: grain is a
 * number and shadow-overlay is a shadow, and both differ per scheme, which
 * is the property this list is about.
 */
const SCHEME_TOKENS = [
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
  'shadow-overlay',
  'shadow-raised',
];

describe('tokens declared in every scheme', () => {
  it('declares every scheme-dependent token in the bare :root', () => {
    for (const name of SCHEME_TOKENS) {
      expect(light.has(name), `--site-${name} missing from :root`).toBe(true);
    }
  });

  it('redeclares the identical set of scheme-dependent tokens for prefers-color-scheme: dark', () => {
    const lightNames = new Set(SCHEME_TOKENS);
    expect(new Set(darkMedia.keys())).toEqual(lightNames);
  });

  it('redeclares the identical set of scheme-dependent tokens for [data-mantine-color-scheme="dark"]', () => {
    const lightNames = new Set(SCHEME_TOKENS);
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

/*
 * The colour-literal rule, as a test rather than a shell grep.
 *
 * It lived only in phase 1's acceptance command, scoped to src/, and that
 * scope let three defects through: index.html and public/manifest.json both
 * carried pre-rebuild colours that no check ever looked at. Widened here to
 * the two non-src files that can hold a colour.
 *
 * It cannot catch a literal that lives inside a dependency's stylesheet,
 * which is how Mantine's component layer rendered stock controls while this
 * check passed. Nothing static can. That class is the browser pass's job.
 */
const repoRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);
const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgb\(|\bhsl\(|\boklch\(/;

function walk(dir: string, extensions: readonly string[]): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(full, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      found.push(full);
    }
  }
  return found;
}

/*
 * Every entry is a known, dated exception rather than a way to silence the
 * rule. Duck Feed's are the ones phase 7 is told by name to remove, and its
 * do-not list forbids touching utils/ before then. types.ts carries two
 * hexes inside doc comments the spec's own type block includes verbatim.
 */
const PENDING_LITERALS = [
  join(
    'features',
    'projects',
    'features',
    'duck-feed',
    'components',
    'duck-feed.css',
  ),
  join('features', 'projects', 'features', 'duck-feed', 'utils', 'avatars.ts'),
  join('shared', 'projects', 'types.ts'),
];

describe('no colour literal outside tokens.css', () => {
  const srcRoot = join(repoRoot, 'src');
  const sourceFiles = walk(srcRoot, ['.css', '.ts', '.tsx']).filter(
    (file) => !file.endsWith(join('shared', 'theme', 'tokens.css')),
  );

  it('finds files to scan', () => {
    expect(sourceFiles.length).toBeGreaterThan(20);
  });

  for (const file of sourceFiles) {
    const rel = relative(srcRoot, file);
    if (PENDING_LITERALS.includes(rel)) continue;
    it(`src${sep}${rel}`, () => {
      const offending = readFileSync(file, 'utf-8')
        .split('\n')
        .map((line, i) => [i + 1, line] as const)
        .filter(([, line]) => COLOUR_LITERAL.test(line));
      expect(offending).toEqual([]);
    });
  }

  it('every pending exception still exists, so the list cannot rot', () => {
    for (const rel of PENDING_LITERALS) {
      expect(
        COLOUR_LITERAL.test(readFileSync(join(srcRoot, rel), 'utf-8')),
        `${rel} is clean; remove it from PENDING_LITERALS`,
      ).toBe(true);
    }
  });
});

/*
 * index.html and manifest.json cannot reference a custom property, so the
 * rule for them is not "no literal" but "no literal that is not a palette
 * value". Anything they name must be declared in tokens.css.
 */
describe('colour literals outside src must be palette values', () => {
  const declaredColours = new Set(
    [...css.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase()),
  );

  const files = [
    join(repoRoot, 'index.html'),
    join(repoRoot, 'public', 'manifest.json'),
  ];

  it.each(files.map((f) => [relative(repoRoot, f), f]))(
    '%s names only palette colours',
    (_label, file) => {
      const literals = [
        ...readFileSync(file, 'utf-8').matchAll(/#[0-9a-fA-F]{3,8}\b/g),
      ].map((m) => m[0].toLowerCase());
      for (const literal of literals) {
        expect(
          declaredColours.has(literal),
          `${literal} is not in tokens.css`,
        ).toBe(true);
      }
    },
  );
});
