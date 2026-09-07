import type React from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { buildThreadPaths } from '@/shared/ui/thread-path';
import classes from '@/shared/ui/thread-spine.module.css';

export interface ThreadAnchor {
  id: string;
  /** Document-space Y of the entry's node, measured from the DOM. */
  y: number;
  /** false renders a hollow node: an in-progress entry. */
  filled: boolean;
}

export interface ThreadSpineProps {
  anchors: readonly ThreadAnchor[];
  /** Default 1. The generator accepts more; do not ship more in phase 5. */
  strands?: number;
  /** Total lateral travel. Default 32 desktop, 14 at <= 640px. */
  bandPx?: number;
}

/*
 * The axis is the column ProjectEntry's 9px status node already occupies, not
 * a separate gutter: ThreadAnchor carries a y and no x, so the x is the
 * thread's own, and the path is pinned to it wherever an entry sits.
 *
 * SPINE_INSET_PX is --site-space-lg, which is also the floor of
 * --site-frame-inset, so the layer's left half always has somewhere to go and
 * never causes a horizontal scroll. It is written to CSS from here rather than
 * read from there because the generator needs it as a number, and one source
 * two consumers read beats two that can drift apart.
 */
const SPINE_INSET_PX = 24;
const NODE_CENTRE_PX = 4.5;
const AXIS_X = SPINE_INSET_PX + NODE_CENTRE_PX;

const BAND_DESKTOP_PX = 32;
const BAND_MOBILE_PX = 14;
const MOBILE_QUERY = '(max-width: 640px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Ambient drift amplitude. Doubled, it is the share of the band it costs. */
const DRIFT_PX = 2;

const HALO_RADIUS = 9;

/** How lit the strand sits while nothing but scroll is driving it. */
const SCROLL_STRENGTH = 0.45;

/** After this long without a pointermove, the pointer stops taking priority. */
const POINTER_IDLE_MS = 900;

interface LayerBox {
  /** Document-space Y of the layer's top. */
  top: number;
  height: number;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);

    sync();
    list.addEventListener('change', sync);
    return () => list.removeEventListener('change', sync);
  }, [query]);

  return matches;
}

export function ThreadSpine({
  anchors,
  strands = 1,
  bandPx,
}: ThreadSpineProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<LayerBox>({ top: 0, height: 0 });

  const isMobile = useMediaQuery(MOBILE_QUERY);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const band = bandPx ?? (isMobile ? BAND_MOBILE_PX : BAND_DESKTOP_PX);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.style.setProperty('--thread-inset', `${SPINE_INSET_PX}px`);
    root.style.setProperty('--thread-axis-x', `${AXIS_X}px`);
    root.style.setProperty('--thread-drift', `${DRIFT_PX}px`);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let frame = 0;

    const measure = () => {
      const rect = root.getBoundingClientRect();
      const next = {
        top: Math.round(rect.top + window.scrollY),
        height: Math.round(rect.height),
      };

      root.style.setProperty('--thread-origin-y', `${next.top}px`);
      setBox((current) =>
        current.top === next.top && current.height === next.height
          ? current
          : next,
      );
    };

    const schedule = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    observer.observe(document.body);
    window.addEventListener('resize', schedule);
    measure();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, []);

  /*
   * One illumination value, three inputs. Every input writes the same two
   * focus properties, so touch, keyboard and mouse produce the identical
   * visual rather than one of them getting a fallback. The bloom pair is the
   * pointer's alone: it is emphasis, and it conveys nothing a keyboard user is
   * missing.
   *
   * Nothing here animates. A listener writes a target when an input arrives,
   * coalesced to one write per frame per burst and idle in between; the CSS
   * transition on the registered properties does the interpolation.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const region = root.parentElement;
    let focusY: number | null = null;
    let pointerY: number | null = null;
    let pointerTimer = 0;
    let frame = 0;

    const set = (name: string, value: string) =>
      root.style.setProperty(name, value);

    const write = () => {
      frame = 0;

      if (pointerY !== null) {
        set('--thread-focus-y', `${pointerY}px`);
        set('--thread-focus-strength', '1');
        set('--thread-bloom-y', `${pointerY}px`);
        set('--thread-bloom-opacity', '1');
        return;
      }

      set('--thread-bloom-opacity', '0');

      if (focusY !== null) {
        set('--thread-focus-y', `${focusY}px`);
        set('--thread-focus-strength', '1');
        return;
      }

      set('--thread-focus-strength', `${SCROLL_STRENGTH}`);
      set(
        '--thread-focus-y',
        reducedMotion
          ? `${box.top + box.height / 2}px`
          : `${window.scrollY + window.innerHeight / 2}px`,
      );
    };

    const schedule = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(write);
    };

    const centreOf = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return Math.round(rect.top + window.scrollY + rect.height / 2);
    };

    const syncFocus = () => {
      const active = document.activeElement;
      focusY =
        region && active && active !== document.body && region.contains(active)
          ? centreOf(active)
          : null;
      schedule();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const axis = rect.left + AXIS_X;
      const withinBand = Math.abs(event.clientX - axis) <= band / 2;
      const withinLayer =
        event.clientY >= rect.top && event.clientY <= rect.bottom;

      window.clearTimeout(pointerTimer);

      if (!withinBand || !withinLayer) {
        pointerY = null;
        schedule();
        return;
      }

      pointerY = Math.round(event.clientY + window.scrollY);
      pointerTimer = window.setTimeout(() => {
        pointerY = null;
        schedule();
      }, POINTER_IDLE_MS);
      schedule();
    };

    document.addEventListener('focusin', syncFocus);
    document.addEventListener('focusout', syncFocus);
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // Reduced motion: the thread stops responding to scroll entirely.
    if (!reducedMotion) {
      window.addEventListener('scroll', schedule, { passive: true });
    }

    write();

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(pointerTimer);
      document.removeEventListener('focusin', syncFocus);
      document.removeEventListener('focusout', syncFocus);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', schedule);
    };
  }, [band, reducedMotion, box.top, box.height]);

  const paths = buildThreadPaths({
    anchors: anchors.map((anchor) => ({ y: anchor.y - box.top })),
    height: box.height,
    axisX: AXIS_X,
    bandPx: band - DRIFT_PX * 2,
    strands,
  });

  return (
    <div aria-hidden="true" className={classes.spine} ref={rootRef}>
      <div className={`${classes.layer} ${classes.glowLayer}`}>
        <svg aria-hidden="true" className={classes.canvas}>
          {paths.map((d) => (
            <path className={classes.strand} d={d} key={d} />
          ))}
        </svg>
      </div>

      <div className={`${classes.layer} ${classes.bloomLayer}`}>
        <svg aria-hidden="true" className={classes.canvas}>
          {paths.map((d) => (
            <path className={classes.strand} d={d} key={d} />
          ))}
        </svg>
      </div>

      <div className={classes.layer}>
        <svg aria-hidden="true" className={classes.canvas} data-thread="strand">
          {paths.map((d) => (
            <path className={classes.strand} d={d} key={d} />
          ))}
          {box.height > 0 &&
            anchors.map((anchor) => (
              <circle
                className={classes.halo}
                cx={AXIS_X}
                cy={anchor.y - box.top}
                data-filled={anchor.filled}
                key={anchor.id}
                r={HALO_RADIUS}
              />
            ))}
        </svg>
      </div>
    </div>
  );
}
