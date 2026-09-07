import { describe, expect, it } from 'vitest';

import {
  buildThreadPaths,
  type ThreadPathInput,
} from '@/shared/ui/thread-path';

/*
 * Tier one: pure logic. The generator's whole contract is geometric, so the
 * test reads the `d` string back rather than asserting on its text. Parsing
 * the public output is still the public surface; asserting the literal string
 * would break on every rounding change without proving anything.
 */

interface Cubic {
  from: { x: number; y: number };
  c1: { x: number; y: number };
  c2: { x: number; y: number };
  to: { x: number; y: number };
}

function parse(d: string): Cubic[] {
  const numbers = d
    .split(/[MC\s]+/)
    .filter((token) => token !== '')
    .map(Number);

  const cubics: Cubic[] = [];
  let cursor = { x: numbers[0], y: numbers[1] };

  for (let i = 2; i + 5 < numbers.length; i += 6) {
    const to = { x: numbers[i + 4], y: numbers[i + 5] };
    cubics.push({
      from: cursor,
      c1: { x: numbers[i], y: numbers[i + 1] },
      c2: { x: numbers[i + 2], y: numbers[i + 3] },
      to,
    });
    cursor = to;
  }

  return cubics;
}

function sampleX(cubic: Cubic, t: number): number {
  const u = 1 - t;
  return (
    u * u * u * cubic.from.x +
    3 * u * u * t * cubic.c1.x +
    3 * u * t * t * cubic.c2.x +
    t * t * t * cubic.to.x
  );
}

const AXIS = 28.5;
const BAND = 28;

const input: ThreadPathInput = {
  anchors: [{ y: 140 }, { y: 420 }, { y: 660 }],
  height: 900,
  axisX: AXIS,
  bandPx: BAND,
  strands: 1,
};

describe('buildThreadPaths', () => {
  it('ships one strand by default input', () => {
    expect(buildThreadPaths(input)).toHaveLength(1);
  });

  it('accepts a set of strands', () => {
    expect(buildThreadPaths({ ...input, strands: 3 })).toHaveLength(3);
  });

  it('gives each strand a different curve', () => {
    const [first, second] = buildThreadPaths({ ...input, strands: 2 });
    expect(first).not.toEqual(second);
  });

  it('is deterministic', () => {
    expect(buildThreadPaths(input)).toEqual(buildThreadPaths(input));
  });

  it('stays inside the band at every sampled point', () => {
    const [d] = buildThreadPaths(input);
    const half = BAND / 2;

    for (const cubic of parse(d)) {
      for (let step = 0; step <= 20; step += 1) {
        const x = sampleX(cubic, step / 20);
        expect(Math.abs(x - AXIS)).toBeLessThanOrEqual(half + 0.01);
      }
    }
  });

  it('uses the full band, so the curve is not a nearly straight line', () => {
    const [d] = buildThreadPaths(input);
    const excursions = parse(d).flatMap((cubic) =>
      Array.from({ length: 21 }, (_, step) =>
        Math.abs(sampleX(cubic, step / 20) - AXIS),
      ),
    );

    expect(Math.max(...excursions)).toBeGreaterThan(BAND / 2 - 0.01);
  });

  it('is not a straight line: every segment is a cubic and x varies', () => {
    const [d] = buildThreadPaths(input);
    const cubics = parse(d);

    expect(cubics.length).toBeGreaterThan(1);
    expect(new Set(cubics.map((cubic) => cubic.to.x)).size).toBeGreaterThan(1);
  });

  it('pins the path to the axis at every anchor', () => {
    const [d] = buildThreadPaths(input);
    const onCurve = parse(d).map((cubic) => cubic.to);

    for (const anchor of input.anchors) {
      const point = onCurve.find((candidate) => candidate.y === anchor.y);
      expect(point, `no on-curve point at y ${anchor.y}`).toBeDefined();
      expect(point?.x).toBe(AXIS);
    }
  });

  it('bows between consecutive anchors rather than beside them', () => {
    const [d] = buildThreadPaths(input);
    const bows = parse(d)
      .map((cubic) => cubic.to)
      .filter((point) => point.x !== AXIS);

    // one between each pair of stops: 0, three anchors, and the height
    expect(bows).toHaveLength(4);
    expect(bows.map((bow) => Math.sign(bow.x - AXIS))).toEqual([-1, 1, -1, 1]);
  });

  it('bows a short run less than a long one, so bends stay long', () => {
    const [d] = buildThreadPaths({
      ...input,
      anchors: [{ y: 30 }, { y: 500 }],
      height: 900,
    });
    const bows = parse(d)
      .map((cubic) => cubic.to)
      .filter((point) => point.x !== AXIS)
      .map((point) => Math.abs(point.x - AXIS));

    // 30px to the first anchor, then 470 and 400: only the long runs fill it
    expect(bows[0]).toBeLessThan(bows[1] / 4);
    expect(bows[1]).toBe(BAND / 2);
  });

  it('sorts anchors it is handed out of order', () => {
    const shuffled = {
      ...input,
      anchors: [{ y: 660 }, { y: 140 }, { y: 420 }],
    };
    expect(buildThreadPaths(shuffled)).toEqual(buildThreadPaths(input));
  });

  it('clamps an anchor that falls outside the layer', () => {
    const outside = {
      ...input,
      anchors: [{ y: -50 }, { y: 420 }, { y: 4000 }],
    };
    const onCurve = parse(buildThreadPaths(outside)[0]).map(
      (cubic) => cubic.to,
    );

    for (const point of onCurve) {
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(outside.height);
    }
  });

  it('still curves when there are no anchors at all', () => {
    const [d] = buildThreadPaths({ ...input, anchors: [] });
    const bows = parse(d)
      .map((cubic) => cubic.to)
      .filter((point) => point.x !== AXIS);

    expect(bows).toHaveLength(1);
  });

  it('draws nothing before the layer has been measured', () => {
    expect(buildThreadPaths({ ...input, height: 0 })).toEqual([]);
    expect(buildThreadPaths({ ...input, bandPx: 0 })).toEqual([]);
    expect(buildThreadPaths({ ...input, strands: 0 })).toEqual([]);
  });
});
