/*
 * The thread's path generator. Pure, and in its own file so tier one can hold
 * it to the band and to the anchors without rendering anything. The spec's
 * file tree lists only thread-spine.tsx under ui/; docs/decisions.md has
 * already ruled that enumeration non-exhaustive, and this is that case.
 *
 * The path is pinned to the axis at every anchor and bows between them, so
 * the curvature is the drift rather than a wobble running alongside it. A
 * straight vertical line with dots on it is a timeline, which is the most
 * likely way this design fails, so the bend is the mechanism and not a
 * finish applied to one.
 */

export interface ThreadPathAnchor {
  /** Y in the thread layer's own pixel space, not document space. */
  y: number;
}

export interface ThreadPathInput {
  anchors: readonly ThreadPathAnchor[];
  /** Height of the thread layer, in the same space as the anchors. */
  height: number;
  /** X of the axis every anchor pins the path to. */
  axisX: number;
  /** Total lateral travel, not amplitude. The curve stays inside it. */
  bandPx: number;
  /** How many strands to generate. Phase 5 ships one. */
  strands: number;
}

interface Point {
  x: number;
  y: number;
}

/*
 * Catmull-Rom through the points, converted to cubics. A sixth of the
 * neighbour span is the standard uniform tension; the control points are then
 * clamped into the band, and a cubic lies inside the hull of its own control
 * points, so clamping is what makes "total travel" a guarantee rather than an
 * intention.
 */
const TENSION = 1 / 6;

/*
 * A bow only reaches the full band when it has this much height to do it in.
 * Shorter runs bow proportionally less, which is what keeps the bends long:
 * given the same amplitude, the short run between the layer's top and the
 * first entry becomes a kink while the long run between two entries is a
 * curve. Scaling by span costs nothing on the long runs and buys back the
 * short ones.
 */
const FULL_BOW_SPAN = 220;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildPoints(input: ThreadPathInput, strandIndex: number): Point[] {
  const { anchors, height, axisX, bandPx } = input;
  const amplitude = bandPx / 2;

  const pinned = anchors.map((anchor) => clamp(anchor.y, 0, height));
  const stops = [...new Set([0, ...pinned, height])].sort((a, b) => a - b);

  const points: Point[] = [{ x: axisX, y: stops[0] }];

  for (let i = 0; i < stops.length - 1; i += 1) {
    const direction = (i + strandIndex) % 2 === 0 ? -1 : 1;
    const span = stops[i + 1] - stops[i];
    const reach = amplitude * Math.min(1, span / FULL_BOW_SPAN);

    points.push({
      x: axisX + direction * reach,
      y: (stops[i] + stops[i + 1]) / 2,
    });
    points.push({ x: axisX, y: stops[i + 1] });
  }

  return points;
}

function toPath(points: readonly Point[], minX: number, maxX: number): string {
  const parts = [`M ${round(points[0].x)} ${round(points[0].y)}`];

  for (let i = 0; i < points.length - 1; i += 1) {
    const before = i > 0 ? points[i - 1] : points[i];
    const from = points[i];
    const to = points[i + 1];
    const after = i + 2 < points.length ? points[i + 2] : to;

    const c1x = clamp(from.x + (to.x - before.x) * TENSION, minX, maxX);
    const c1y = from.y + (to.y - before.y) * TENSION;
    const c2x = clamp(to.x - (after.x - from.x) * TENSION, minX, maxX);
    const c2y = to.y - (after.y - from.y) * TENSION;

    parts.push(
      `C ${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(to.x)} ${round(to.y)}`,
    );
  }

  return parts.join(' ');
}

/**
 * One `d` string per strand. Empty when there is nothing to draw, so a layer
 * that has not been measured yet renders no path rather than a degenerate one.
 */
export function buildThreadPaths(input: ThreadPathInput): string[] {
  const count = Math.max(0, Math.floor(input.strands));
  if (count === 0 || input.height <= 0 || input.bandPx <= 0) return [];

  const amplitude = input.bandPx / 2;
  const paths: string[] = [];

  for (let strand = 0; strand < count; strand += 1) {
    paths.push(
      toPath(
        buildPoints(input, strand),
        input.axisX - amplitude,
        input.axisX + amplitude,
      ),
    );
  }

  return paths;
}
